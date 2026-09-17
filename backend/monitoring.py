from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_database
from risk_engine import calculate_risk
from ai.ml_risk_engine import predict_ml_risk


router = APIRouter(
    prefix="/monitoring",
    tags=["Journey Monitoring"]
)


# =========================================================
# REQUEST MODELS
# =========================================================

class MonitoringStart(BaseModel):
    user_id: int
    destination: str | None = None


class LocationUpdate(BaseModel):
    session_id: int
    latitude: float
    longitude: float
    speed: float = 0
    stationary_duration: int = 0
    off_route: bool = False


class MonitoringEnd(BaseModel):
    session_id: int
    end_reason: str = "Reached Safely"


class MonitoringInterrupt(BaseModel):
    session_id: int
    reason: str = "Journey connection interrupted"


# =========================================================
# START MONITORING
# =========================================================

@router.post("/start")
def start_monitoring(data: MonitoringStart):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        # -------------------------------------------------
        # CHECK USER
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT id, full_name
            FROM users
            WHERE id=%s
            """,
            (data.user_id,)
        )

        user = cursor.fetchone()

        if not user:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )


        # -------------------------------------------------
        # CHECK FOR OLD ACTIVE JOURNEY
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT id
            FROM monitoring_sessions
            WHERE user_id=%s
            AND status='Active'
            ORDER BY id DESC
            LIMIT 1
            """,
            (data.user_id,)
        )

        active_session = cursor.fetchone()


        if active_session:

            # IMPORTANT:
            # An abandoned journey is NOT a completed
            # safe journey.

            cursor.execute(
                """
                UPDATE monitoring_sessions
                SET
                    status='Journey Interrupted',
                    ended_at=NOW(),
                    end_reason='Replaced by a new monitoring session'
                WHERE id=%s
                """,
                (active_session["id"],)
            )

            cursor.execute(
                """
                INSERT INTO admin_notifications
                (
                    user_id,
                    session_id,
                    notification_type,
                    title,
                    message,
                    is_read
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    data.user_id,
                    active_session["id"],
                    "JOURNEY_INTERRUPTED",
                    "Journey Interrupted",
                    f"{user['full_name']}'s previous journey was interrupted because a new journey was started.",
                    0
                )
            )

            connection.commit()


        # -------------------------------------------------
        # CREATE NEW JOURNEY
        # -------------------------------------------------

        cursor.execute(
            """
            INSERT INTO monitoring_sessions
            (
                user_id,
                destination,
                status,
                final_risk_score
            )
            VALUES (%s, %s, %s, %s)
            """,
            (
                data.user_id,
                data.destination,
                "Active",
                10
            )
        )

        connection.commit()

        session_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO admin_notifications
            (
                user_id,
                session_id,
                notification_type,
                title,
                message,
                is_read
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                data.user_id,
                session_id,
                "JOURNEY_STARTED",
                "Journey Started",
                f"{user['full_name']} started a monitored journey to {data.destination or 'an unspecified destination'}.",
                0
            )
        )

        connection.commit()


        return {

            "message":
                "Night monitoring started successfully",

            "session": {

                "id":
                    session_id,

                "user_id":
                    data.user_id,

                "destination":
                    data.destination,

                "status":
                    "Active",

                "risk_score":
                    10,

                "risk_level":
                    "Low"
            }
        }


    except HTTPException:

        if connection:
            connection.rollback()

        raise


    except Exception as error:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# SAVE LOCATION + CALCULATE RISK
# =========================================================

@router.post("/location")
def save_location(data: LocationUpdate):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)


        # -------------------------------------------------
        # CHECK SESSION
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                status,
                started_at
            FROM monitoring_sessions
            WHERE id=%s
            """,
            (data.session_id,)
        )

        session = cursor.fetchone()


        if not session:

            raise HTTPException(
                status_code=404,
                detail="Monitoring session not found"
            )


        if session["status"] != "Active":

            raise HTTPException(
                status_code=400,
                detail="Monitoring session is not active"
            )


        # =================================================
        # RULE-BASED RISK
        # =================================================

        rule_score, rule_level, rule_reason = (
            calculate_risk(
                walking_speed=data.speed,
                stationary_seconds=data.stationary_duration,
                off_route=data.off_route,
                emergency_pressed=False
            )
        )


        # =================================================
        # MACHINE LEARNING RISK
        # =================================================

        ml_prediction = predict_ml_risk(
            walking_speed=data.speed,
            stationary_seconds=data.stationary_duration,
            off_route=data.off_route
        )


        ml_score = ml_prediction["risk_score"]
        ml_level = ml_prediction["risk_level"]
        ml_confidence = ml_prediction["confidence"]


        # =========================================================
        # HYBRID AI DECISION
        #
        # Safety logic has priority over ML.
        # ML supports uncertain situations but cannot create
        # High/Critical risk by itself during normal walking.
        # =========================================================

        try:
            ml_confidence_value = float(ml_confidence)
        except (TypeError, ValueError):
            ml_confidence_value = 0.0


        # ---------------------------------------------------------
        # 1. OFF-ROUTE
        # ---------------------------------------------------------

        if data.off_route:

            final_score = 75
            final_level = "High"
            final_reason = (
                "User has moved away from the planned route "
                "and confirmation is required"
            )


        # ---------------------------------------------------------
        # 2. PROLONGED STATIONARY BEHAVIOUR
        # ---------------------------------------------------------

        elif data.stationary_duration >= 120:

            final_score = 75
            final_level = "High"
            final_reason = (
                "User has been stationary for more than 2 minutes "
                "and safety confirmation is required"
            )


        # ---------------------------------------------------------
        # 3. DEVELOPING STATIONARY RISK
        # ---------------------------------------------------------

        elif data.stationary_duration >= 60:

            final_score = 45
            final_level = "Medium"
            final_reason = (
                "User has remained stationary for an extended period"
            )


        # ---------------------------------------------------------
        # 4. NORMAL WALKING
        # ---------------------------------------------------------

        elif (
            data.speed >= 0.30
            and data.stationary_duration <= 15
        ):

            final_score = 10
            final_level = "Low"
            final_reason = (
                "Normal walking behaviour detected"
            )


        # ---------------------------------------------------------
        # 5. SHORT STOP / GPS UNCERTAINTY
        # ---------------------------------------------------------

        elif data.stationary_duration < 30:

            final_score = 10
            final_level = "Low"
            final_reason = (
                "Journey monitoring active"
            )


        # ---------------------------------------------------------
        # 6. MODERATE STATIONARY PERIOD
        # ---------------------------------------------------------

        elif data.stationary_duration < 60:

            final_score = 30
            final_level = "Medium"
            final_reason = (
                "Temporary stationary behaviour detected"
            )


        # ---------------------------------------------------------
        # 7. FALLBACK
        # ---------------------------------------------------------

        else:

            final_score = rule_score
            final_level = rule_level
            final_reason = rule_reason


        # =========================================================
        # ML SUPPORT
        #
        # ML may raise an uncertain Low situation to Medium,
        # but it cannot independently create High or Critical risk.
        # =========================================================

        if (
            final_level == "Low"
            and ml_level in ["Medium", "High", "Critical"]
            and ml_confidence_value >= 75.0
            and data.speed < 0.30
            and data.stationary_duration >= 20
        ):

            final_score = 45
            final_level = "Medium"
            final_reason = (
                "AI detected unusual journey behaviour "
                f"with {ml_confidence_value:.1f}% confidence"
            )


        # =================================================
        # JOURNEY STARTUP WARM-UP
        # =================================================

        warmup_seconds = 30

        started_at = session.get("started_at")

        if started_at:

            journey_age_seconds = (
                datetime.now() - started_at
            ).total_seconds()

            if journey_age_seconds < warmup_seconds:

                final_score = 10
                final_level = "Low"
                final_reason = (
                    "Journey startup warm-up active"
                )


        risk = {

            "risk_score":
                final_score,

            "risk_level":
                final_level,

            "reason":
                final_reason,

            "ai_prediction": {

                "risk_score":
                    ml_score,

                "risk_level":
                    ml_level,

                "confidence":
                    ml_confidence,

                "probabilities":
                    ml_prediction["probabilities"]
            },

            "rule_prediction": {

                "risk_score":
                    rule_score,

                "risk_level":
                    rule_level,

                "reason":
                    rule_reason
            }
        }


        # =================================================
        # STORE LOCATION
        # =================================================

        cursor.execute(
            """
            INSERT INTO location_points
            (
                session_id,
                latitude,
                longitude,
                speed,
                stationary_duration
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                data.session_id,
                data.latitude,
                data.longitude,
                data.speed,
                data.stationary_duration
            )
        )


        # =================================================
        # STORE RISK EVENT
        # =================================================

        cursor.execute(
            """
            INSERT INTO risk_events
            (
                session_id,
                risk_score,
                risk_level,
                reason
            )
            VALUES (%s, %s, %s, %s)
            """,
            (
                data.session_id,
                risk["risk_score"],
                risk["risk_level"],
                risk["reason"]
            )
        )


        # =================================================
        # UPDATE CURRENT/FULL JOURNEY RISK
        # =================================================

        cursor.execute(
            """
            UPDATE monitoring_sessions
            SET final_risk_score=%s
            WHERE id=%s
            """,
            (
                risk["risk_score"],
                data.session_id
            )
        )


        connection.commit()


        return {

            "message":
                "Location recorded successfully",

            "session_id":
                data.session_id,

            "location": {

                "latitude":
                    data.latitude,

                "longitude":
                    data.longitude,

                "speed":
                    data.speed,

                "stationary_duration":
                    data.stationary_duration
            },

            "risk":
                risk
        }


    except HTTPException:

        if connection:
            connection.rollback()

        raise


    except Exception as error:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# END MONITORING
# =========================================================

@router.post("/end")
def end_monitoring(data: MonitoringEnd):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)


        cursor.execute(
            """
            SELECT
                ms.id,
                ms.status,
                ms.user_id,
                ms.destination,
                u.full_name
            FROM monitoring_sessions ms
            INNER JOIN users u
                ON u.id = ms.user_id
            WHERE ms.id=%s
            """,
            (data.session_id,)
        )

        session = cursor.fetchone()


        if not session:

            raise HTTPException(
                status_code=404,
                detail="Monitoring session not found"
            )


        if session["status"] != "Active":

            raise HTTPException(
                status_code=400,
                detail="Monitoring session has already ended"
            )


        # -------------------------------------------------
        # DETERMINE FINAL STATUS
        # -------------------------------------------------

        if data.end_reason == "Cancelled by User":

         journey_status = "Journey Cancelled"

        elif data.end_reason == "Journey Interrupted":

         journey_status = "Journey Interrupted"

        elif data.end_reason in [
           "Automatic Emergency Triggered",
           "Manual Emergency Triggered"
]:

         journey_status = "Emergency Triggered"

        else:

         journey_status = "Journey Completed"


        # -------------------------------------------------
        # CLOSE JOURNEY
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE monitoring_sessions
            SET
                status=%s,
                ended_at=NOW(),
                end_reason=%s
            WHERE id=%s
            """,
            (
                journey_status,
                data.end_reason,
                data.session_id
            )
        )

        notification_type = None
        notification_title = None
        notification_message = None

        if journey_status == "Journey Completed":
            notification_type = "JOURNEY_COMPLETED"
            notification_title = "Journey Completed"
            notification_message = (
                f"{session['full_name']} completed the journey safely"
                f" to {session['destination'] or 'the destination'}."
            )

        elif journey_status == "Journey Cancelled":
            notification_type = "JOURNEY_CANCELLED"
            notification_title = "Journey Cancelled"
            notification_message = (
                f"{session['full_name']} cancelled the monitored journey."
            )

        elif journey_status == "Journey Interrupted":
            notification_type = "JOURNEY_INTERRUPTED"
            notification_title = "Journey Interrupted"
            notification_message = (
                f"{session['full_name']}'s monitored journey was interrupted."
            )

        # Emergency Triggered already has the existing critical alert popup,
        # so we do not duplicate it as a normal journey toast here.
        if notification_type:
            cursor.execute(
                """
                INSERT INTO admin_notifications
                (
                    user_id,
                    session_id,
                    notification_type,
                    title,
                    message,
                    is_read
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    session["user_id"],
                    data.session_id,
                    notification_type,
                    notification_title,
                    notification_message,
                    0
                )
            )


        connection.commit()


        return {

            "message":
                "Monitoring ended successfully",

            "session_id":
                data.session_id,

            "status":
                journey_status,

            "end_reason":
                data.end_reason
        }


    except HTTPException:

        if connection:
            connection.rollback()

        raise


    except Exception as error:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# INTERRUPT JOURNEY
# =========================================================

@router.post("/interrupt")
def interrupt_monitoring(
    data: MonitoringInterrupt
):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)


        cursor.execute(
            """
            SELECT
                ms.id,
                ms.status,
                ms.user_id,
                u.full_name
            FROM monitoring_sessions ms
            INNER JOIN users u
                ON u.id = ms.user_id
            WHERE ms.id=%s
            """,
            (data.session_id,)
        )

        session = cursor.fetchone()


        if not session:

            raise HTTPException(
                status_code=404,
                detail="Monitoring session not found"
            )


        # Already finished journeys do not need
        # another state change.

        if session["status"] != "Active":

            return {

                "message":
                    "Journey is already closed",

                "session_id":
                    data.session_id,

                "status":
                    session["status"]
            }


        cursor.execute(
            """
            UPDATE monitoring_sessions
            SET
                status='Journey Interrupted',
                ended_at=NOW(),
                end_reason=%s
            WHERE id=%s
            """,
            (
                data.reason,
                data.session_id
            )
        )

        cursor.execute(
            """
            INSERT INTO admin_notifications
            (
                user_id,
                session_id,
                notification_type,
                title,
                message,
                is_read
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                session["user_id"],
                data.session_id,
                "JOURNEY_INTERRUPTED",
                "Journey Interrupted",
                f"{session['full_name']}'s monitored journey was interrupted.",
                0
            )
        )


        connection.commit()


        return {

            "message":
                "Journey marked as interrupted",

            "session_id":
                data.session_id,

            "status":
                "Journey Interrupted",

            "reason":
                data.reason
        }


    except HTTPException:

        if connection:
            connection.rollback()

        raise


    except Exception as error:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET ACTIVE JOURNEY FOR USER
# =========================================================

@router.get("/user/{user_id}/active")
def get_active_user_journey(
    user_id: int
):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)


        # -------------------------------------------------
        # GET ACTIVE SESSION
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                monitoring_sessions.*,
                users.full_name,
                users.email,
                users.phone_number
            FROM monitoring_sessions
            INNER JOIN users
                ON users.id =
                   monitoring_sessions.user_id
            WHERE monitoring_sessions.user_id=%s
            AND monitoring_sessions.status='Active'
            ORDER BY monitoring_sessions.id DESC
            LIMIT 1
            """,
            (user_id,)
        )

        session = cursor.fetchone()


        if not session:

            return {

                "active":
                    False,

                "session":
                    None,

                "latest_location":
                    None,

                "latest_risk":
                    None
            }


        # -------------------------------------------------
        # LATEST LOCATION
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                latitude,
                longitude,
                speed,
                stationary_duration,
                recorded_at
            FROM location_points
            WHERE session_id=%s
            ORDER BY recorded_at DESC
            LIMIT 1
            """,
            (session["id"],)
        )

        latest_location = cursor.fetchone()


        # -------------------------------------------------
        # LATEST RISK
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                risk_score,
                risk_level,
                reason,
                created_at
            FROM risk_events
            WHERE session_id=%s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (session["id"],)
        )

        latest_risk = cursor.fetchone()


        return {

            "active":
                True,

            "session":
                session,

            "latest_location":
                latest_location,

            "latest_risk":
                latest_risk
        }


    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# GET MONITORING SESSION
# =========================================================

@router.get("/session/{session_id}")
def get_monitoring_session(
    session_id: int
):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)


        cursor.execute(
            """
            SELECT
                monitoring_sessions.*,
                users.full_name,
                users.email,
                users.phone_number
            FROM monitoring_sessions
            INNER JOIN users
                ON users.id =
                   monitoring_sessions.user_id
            WHERE monitoring_sessions.id=%s
            """,
            (session_id,)
        )


        session = cursor.fetchone()


        if not session:

            raise HTTPException(
                status_code=404,
                detail="Monitoring session not found"
            )


        # -------------------------------------------------
        # LOCATION HISTORY
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM location_points
            WHERE session_id=%s
            ORDER BY recorded_at DESC
            LIMIT 50
            """,
            (session_id,)
        )

        locations = cursor.fetchall()


        # -------------------------------------------------
        # RISK HISTORY
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT *
            FROM risk_events
            WHERE session_id=%s
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (session_id,)
        )

        risk_events = cursor.fetchall()


        return {

            "session":
                session,

            "locations":
                locations,

            "risk_events":
                risk_events
        }


    except HTTPException:
        raise


    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# USER DASHBOARD STATISTICS
# =========================================================

@router.get("/user/{user_id}/statistics")
def get_user_statistics(
    user_id: int
):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)


        cursor.execute(
            """
            SELECT

                COUNT(*) AS total_journeys,

                SUM(
                    CASE
                        WHEN status='Journey Completed'
                        THEN 1
                        ELSE 0
                    END
                ) AS safe_journeys,

                SUM(
                    CASE
                        WHEN status='Journey Cancelled'
                        THEN 1
                        ELSE 0
                    END
                ) AS cancelled_journeys,

                SUM(
                    CASE
                        WHEN status='Journey Interrupted'
                        THEN 1
                        ELSE 0
                    END
                ) AS interrupted_journeys

            FROM monitoring_sessions

            WHERE user_id=%s
            """,
            (user_id,)
        )


        stats = cursor.fetchone()


        cursor.execute(
            """
            SELECT COUNT(*) AS sos_count
            FROM emergency_alerts
            WHERE user_id=%s
            """,
            (user_id,)
        )


        sos = cursor.fetchone()


        return {

            "total_journeys":
                stats["total_journeys"] or 0,

            "safe_journeys":
                stats["safe_journeys"] or 0,

            "cancelled_journeys":
                stats["cancelled_journeys"] or 0,

            "interrupted_journeys":
                stats["interrupted_journeys"] or 0,

            "sos_activated":
                sos["sos_count"] or 0
        }


    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()