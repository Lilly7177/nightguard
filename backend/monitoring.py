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


# =====================================
# Request Models
# =====================================

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


# =====================================
# Risk Calculation
# =====================================


# =====================================
# Start Monitoring
# =====================================

@router.post("/start")
def start_monitoring(data: MonitoringStart):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        # Check user
        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE id = %s
            """,
            (data.user_id,)
        )

        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

                # Check if user already has an active session
        cursor.execute(
            """
            SELECT id
            FROM monitoring_sessions
            WHERE user_id = %s
            AND status = 'Active'
            ORDER BY id DESC
            LIMIT 1
            """,
            (data.user_id,)
        )

        active_session = cursor.fetchone()

        if active_session:

            cursor.execute(
                """
                UPDATE monitoring_sessions
                SET
                    status = 'Completed',
                    ended_at = NOW(),
                    end_reason = 'Automatically closed'
                WHERE id = %s
                """,
                (active_session["id"],)
            )

            connection.commit()
      

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

        return {
            "message": "Night monitoring started successfully",
            "session": {
                "id": session_id,
                "user_id": data.user_id,
                "destination": data.destination,
                "status": "Active",
                "risk_score": 10,
                "risk_level": "Low"
            }
        }

    except HTTPException:
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


# =====================================
# Save Location and Calculate Risk
# =====================================

@router.post("/location")
def save_location(data: LocationUpdate):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, status
            FROM monitoring_sessions
            WHERE id = %s
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

               # =====================================
        # Rule-Based Risk Prediction
        # =====================================

        rule_score, rule_level, rule_reason = calculate_risk(
            walking_speed=data.speed,
            stationary_seconds=data.stationary_duration,
            off_route=data.off_route,
            emergency_pressed=False
        )

        # =====================================
        # Machine Learning Risk Prediction
        # =====================================

        ml_prediction = predict_ml_risk(
            walking_speed=data.speed,
            stationary_seconds=data.stationary_duration,
            off_route=data.off_route
        )

        ml_score = ml_prediction["risk_score"]
        ml_level = ml_prediction["risk_level"]
        ml_confidence = ml_prediction["confidence"]

        # =====================================
        # Hybrid AI Decision
        # =====================================

        if ml_score > rule_score:
            final_score = ml_score
            final_level = ml_level
            final_reason = (
                f"AI predicted {ml_level} risk "
                f"with {ml_confidence}% confidence"
            )
        else:
            final_score = rule_score
            final_level = rule_level
            final_reason = rule_reason

        risk = {
            "risk_score": final_score,
            "risk_level": final_level,
            "reason": final_reason,

            "ai_prediction": {
                "risk_score": ml_score,
                "risk_level": ml_level,
                "confidence": ml_confidence,
                "probabilities": ml_prediction["probabilities"]
            },

            "rule_prediction": {
                "risk_score": rule_score,
                "risk_level": rule_level,
                "reason": rule_reason
            }
        }

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

        cursor.execute(
            """
            UPDATE monitoring_sessions
            SET final_risk_score = %s
            WHERE id = %s
            """,
            (
                risk["risk_score"],
                data.session_id
            )
        )

        connection.commit()

        return {
            "message": "Location recorded successfully",
            "session_id": data.session_id,
            "location": {
                "latitude": data.latitude,
                "longitude": data.longitude,
                "speed": data.speed,
                "stationary_duration": data.stationary_duration
            },
            "risk": risk
        }

    except HTTPException:
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


# =====================================
# End Monitoring
# =====================================

@router.post("/end")
def end_monitoring(data: MonitoringEnd):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, status
            FROM monitoring_sessions
            WHERE id = %s
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

        journey_status = (
            "Journey Cancelled"
            if data.end_reason == "Cancelled by User"
            else "Journey Completed"
        )

        cursor.execute(
            """
            UPDATE monitoring_sessions
            SET
                status = %s,
                ended_at = NOW(),
                end_reason = %s
            WHERE id = %s
            """,
            (
                journey_status,
                data.end_reason,
                data.session_id
            )
        )


        connection.commit()

        return {
            "message": "Monitoring ended successfully",
            "session_id": data.session_id,
            "status": journey_status,
            "end_reason": data.end_reason
        }

    except HTTPException:
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


# =====================================
# Get Monitoring Session
# =====================================

@router.get("/session/{session_id}")
def get_monitoring_session(session_id: int):

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
                ON users.id = monitoring_sessions.user_id
            WHERE monitoring_sessions.id = %s
            """,
            (session_id,)
        )

        session = cursor.fetchone()

        if not session:
            raise HTTPException(
                status_code=404,
                detail="Monitoring session not found"
            )

        cursor.execute(
            """
            SELECT *
            FROM location_points
            WHERE session_id = %s
            ORDER BY recorded_at DESC
            LIMIT 50
            """,
            (session_id,)
        )

        locations = cursor.fetchall()

        cursor.execute(
            """
            SELECT *
            FROM risk_events
            WHERE session_id = %s
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (session_id,)
        )

        risk_events = cursor.fetchall()

        return {
            "session": session,
            "locations": locations,
            "risk_events": risk_events
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

# =====================================
# User Dashboard Statistics
# =====================================

@router.get("/user/{user_id}/statistics")
def get_user_statistics(user_id: int):
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
                        WHEN status = 'Journey Completed'
                        THEN 1
                        ELSE 0
                    END
                ) AS safe_journeys,

                SUM(
                    CASE
                        WHEN status = 'Journey Cancelled'
                        THEN 1
                        ELSE 0
                    END
                ) AS cancelled_journeys

            FROM monitoring_sessions
            WHERE user_id = %s
            """,
            (user_id,)
        )

        stats = cursor.fetchone()

        cursor.execute(
            """
            SELECT
                COUNT(*) AS sos_count
            FROM emergency_alerts
            WHERE user_id = %s
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