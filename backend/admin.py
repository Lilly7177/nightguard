from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_database


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# =========================================================
# MODELS
# =========================================================

class AdminLogin(BaseModel):
    email: str
    password: str


class UpdateTrustedContact(BaseModel):
    contact_name: str
    contact_phone: str
    relationship: str


class UpdateUser(BaseModel):
    full_name: str
    email: str
    phone_number: str


# =========================================================
# ADMIN LOGIN
# =========================================================

@router.post("/login")
def admin_login(admin: AdminLogin):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT *
            FROM admins
            WHERE email=%s
            AND password=%s
            """,
            (
                admin.email,
                admin.password
            )
        )

        result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=401,
                detail="Invalid admin credentials"
            )

        return {
            "message": "Admin login successful",
            "admin": result
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@router.get("/dashboard")
def admin_dashboard():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        # Total users
        cursor.execute(
            "SELECT COUNT(*) AS total FROM users"
        )
        users = cursor.fetchone()["total"]

        # Total alerts
        cursor.execute(
            "SELECT COUNT(*) AS total FROM emergency_alerts"
        )
        alerts = cursor.fetchone()["total"]

        # Active alerts
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM emergency_alerts
            WHERE status='Active'
            """
        )
        active = cursor.fetchone()["total"]

        # Resolved alerts
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM emergency_alerts
            WHERE status='Resolved'
            """
        )
        resolved = cursor.fetchone()["total"]

        # Active journeys
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM monitoring_sessions
            WHERE status='Active'
            """
        )
        active_monitoring = cursor.fetchone()["total"]

        return {
            "users": users,
            "alerts": alerts,
            "active": active,
            "resolved": resolved,
            "active_monitoring": active_monitoring
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
# GET ALL USERS
# =========================================================

@router.get("/users")
def get_all_users():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                email,
                phone_number,
                created_at
            FROM users
            ORDER BY id DESC
            """
        )

        users = cursor.fetchall()

        return {
            "users": users
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
# UPDATE REGISTERED USER
# =========================================================

@router.put("/users/{user_id}")
def update_registered_user(
    user_id: int,
    user: UpdateUser
):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE id=%s
            """,
            (user_id,)
        )

        existing_user = cursor.fetchone()

        if not existing_user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        cursor.execute(
            """
            UPDATE users
            SET
                full_name=%s,
                email=%s,
                phone_number=%s
            WHERE id=%s
            """,
            (
                user.full_name,
                user.email,
                user.phone_number,
                user_id
            )
        )

        connection.commit()

        return {
            "message": "User updated successfully"
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
# DELETE REGISTERED USER
# =========================================================

@router.delete("/users/{user_id}")
def delete_registered_user(user_id: int):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE id=%s
            """,
            (user_id,)
        )

        existing_user = cursor.fetchone()

        if not existing_user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # Delete emergency alerts
        cursor.execute(
            """
            DELETE FROM emergency_alerts
            WHERE user_id=%s
            """,
            (user_id,)
        )

        # Delete trusted contacts
        cursor.execute(
            """
            DELETE FROM trusted_contacts
            WHERE user_id=%s
            """,
            (user_id,)
        )

        # Delete risk events
        cursor.execute(
            """
            DELETE FROM risk_events
            WHERE session_id IN (
                SELECT id
                FROM monitoring_sessions
                WHERE user_id=%s
            )
            """,
            (user_id,)
        )

        # Delete location points
        cursor.execute(
            """
            DELETE FROM location_points
            WHERE session_id IN (
                SELECT id
                FROM monitoring_sessions
                WHERE user_id=%s
            )
            """,
            (user_id,)
        )

        # Delete monitoring sessions
        cursor.execute(
            """
            DELETE FROM monitoring_sessions
            WHERE user_id=%s
            """,
            (user_id,)
        )

        # Delete user
        cursor.execute(
            """
            DELETE FROM users
            WHERE id=%s
            """,
            (user_id,)
        )

        connection.commit()

        return {
            "message": "User deleted successfully"
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
# GET ALL EMERGENCY ALERTS
# =========================================================

@router.get("/alerts")
def get_all_alerts():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                emergency_alerts.id,
                emergency_alerts.user_id,
                users.full_name,
                users.email,
                users.phone_number,
                emergency_alerts.alert_type,
                emergency_alerts.location,
                emergency_alerts.message,
                emergency_alerts.status,
                emergency_alerts.created_at
            FROM emergency_alerts
            INNER JOIN users
                ON emergency_alerts.user_id = users.id
            ORDER BY emergency_alerts.created_at DESC
            """
        )

        alerts = cursor.fetchall()

        return {
            "alerts": alerts
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
# UPDATE EMERGENCY ALERT STATUS
# =========================================================

@router.put("/alerts/{alert_id}")
def update_alert_status(
    alert_id: int,
    status: str
):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        allowed_statuses = [
            "Active",
            "Resolved",
            "Cancelled"
        ]

        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid alert status"
            )

        cursor.execute(
            """
            SELECT id
            FROM emergency_alerts
            WHERE id=%s
            """,
            (alert_id,)
        )

        existing_alert = cursor.fetchone()

        if not existing_alert:
            raise HTTPException(
                status_code=404,
                detail="Emergency alert not found"
            )

        cursor.execute(
            """
            UPDATE emergency_alerts
            SET status=%s
            WHERE id=%s
            """,
            (
                status,
                alert_id
            )
        )

        connection.commit()

        return {
            "message": "Alert updated successfully"
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
# GET ALL TRUSTED CONTACTS
# =========================================================

@router.get("/contacts")
def get_all_contacts():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                trusted_contacts.id,
                trusted_contacts.user_id,
                users.full_name,
                users.email,
                trusted_contacts.contact_name,
                trusted_contacts.contact_phone,
                trusted_contacts.relationship
            FROM trusted_contacts
            INNER JOIN users
                ON trusted_contacts.user_id = users.id
            ORDER BY trusted_contacts.id DESC
            """
        )

        contacts = cursor.fetchall()

        return {
            "contacts": contacts
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
# GET TRUSTED CONTACTS FOR ONE USER
# =========================================================

@router.get("/users/{user_id}/contacts")
def get_user_trusted_contacts(user_id: int):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                user_id,
                contact_name,
                contact_phone,
                relationship
            FROM trusted_contacts
            WHERE user_id=%s
            ORDER BY id DESC
            """,
            (user_id,)
        )

        contacts = cursor.fetchall()

        return {
            "contacts": contacts
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
# UPDATE TRUSTED CONTACT
# =========================================================

@router.put("/contacts/{contact_id}")
def update_trusted_contact(
    contact_id: int,
    contact: UpdateTrustedContact
):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM trusted_contacts
            WHERE id=%s
            """,
            (contact_id,)
        )

        existing_contact = cursor.fetchone()

        if not existing_contact:
            raise HTTPException(
                status_code=404,
                detail="Trusted contact not found"
            )

        cursor.execute(
            """
            UPDATE trusted_contacts
            SET
                contact_name=%s,
                contact_phone=%s,
                relationship=%s
            WHERE id=%s
            """,
            (
                contact.contact_name,
                contact.contact_phone,
                contact.relationship,
                contact_id
            )
        )

        connection.commit()

        return {
            "message": "Trusted contact updated successfully"
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
# DELETE TRUSTED CONTACT
# =========================================================

@router.delete("/contacts/{contact_id}")
def delete_trusted_contact(contact_id: int):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM trusted_contacts
            WHERE id=%s
            """,
            (contact_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Trusted contact not found"
            )

        connection.commit()

        return {
            "message": "Trusted contact deleted successfully"
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
# LIVE MONITORING
# =========================================================

@router.get("/live-monitoring")
def get_live_monitoring():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        # -------------------------------------------------
        # GET ALL ACTIVE MONITORING SESSIONS
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                ms.id AS session_id,
                ms.user_id,
                ms.destination,
                ms.status,
                ms.final_risk_score,
                ms.started_at,
                u.full_name,
                u.email,
                u.phone_number
            FROM monitoring_sessions ms
            INNER JOIN users u
                ON u.id = ms.user_id
            WHERE ms.status = 'Active'
            ORDER BY ms.started_at DESC
            """
        )

        sessions = cursor.fetchall()

        journeys = []

        # -------------------------------------------------
        # BUILD COMPLETE LIVE JOURNEY INFORMATION
        # -------------------------------------------------

        for session in sessions:

            session_id = session["session_id"]
            user_id = session["user_id"]

            # =============================================
            # LATEST LOCATION
            # =============================================

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
                (session_id,)
            )

            latest_location = cursor.fetchone()

            # =============================================
            # LATEST RISK
            # =============================================

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
                (session_id,)
            )

            latest_risk = cursor.fetchone()

            # =============================================
            # TRUSTED CONTACTS
            # =============================================

            cursor.execute(
                """
                SELECT
                    id,
                    contact_name,
                    contact_phone,
                    relationship
                FROM trusted_contacts
                WHERE user_id=%s
                ORDER BY id DESC
                """,
                (user_id,)
            )

            trusted_contacts = cursor.fetchall()

            # =============================================
            # ACTIVE EMERGENCY ALERT
            # =============================================

            cursor.execute(
                """
                SELECT
                    id,
                    alert_type,
                    location,
                    message,
                    status,
                    created_at
                FROM emergency_alerts
                WHERE user_id=%s
                AND status='Active'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,)
            )

            active_alert = cursor.fetchone()

            # =============================================
            # LOCATION VALUES
            # =============================================

            latitude = None
            longitude = None
            speed = 0
            stationary_duration = 0
            location_updated_at = None

            if latest_location:
                latitude = latest_location["latitude"]
                longitude = latest_location["longitude"]
                speed = latest_location["speed"]
                stationary_duration = latest_location[
                    "stationary_duration"
                ]
                location_updated_at = latest_location[
                    "recorded_at"
                ]

            # =============================================
            # RISK VALUES
            # =============================================

            risk_score = session["final_risk_score"] or 0
            risk_level = "Low"
            risk_reason = "Monitoring started"
            risk_updated_at = None

            if latest_risk:
                risk_score = latest_risk["risk_score"]
                risk_level = latest_risk["risk_level"]
                risk_reason = latest_risk["reason"]
                risk_updated_at = latest_risk["created_at"]

            # =============================================
            # BUILD JOURNEY
            # =============================================

            journey = {
                "session_id": session_id,
                "user_id": user_id,

                "full_name": session["full_name"],
                "email": session["email"],
                "phone_number": session["phone_number"],

                "destination": session["destination"],
                "status": session["status"],
                "started_at": session["started_at"],

                "latitude": latitude,
                "longitude": longitude,
                "speed": speed,
                "stationary_duration": stationary_duration,
                "location_updated_at": location_updated_at,

                "risk_score": risk_score,
                "risk_level": risk_level,
                "risk_reason": risk_reason,
                "risk_updated_at": risk_updated_at,

                "trusted_contacts": trusted_contacts,

                "active_alert": active_alert
            }

            journeys.append(journey)

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return {
            "active_monitoring": len(journeys),
            "journeys": journeys
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
# GET ONE LIVE JOURNEY
# =========================================================

@router.get("/live-monitoring/{session_id}")
def get_live_monitoring_session(session_id: int):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        # -------------------------------------------------
        # SESSION + USER
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                ms.id AS session_id,
                ms.user_id,
                ms.destination,
                ms.status,
                ms.final_risk_score,
                ms.started_at,
                ms.ended_at,
                ms.end_reason,
                u.full_name,
                u.email,
                u.phone_number
            FROM monitoring_sessions ms
            INNER JOIN users u
                ON u.id = ms.user_id
            WHERE ms.id=%s
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
            SELECT
                id,
                latitude,
                longitude,
                speed,
                stationary_duration,
                recorded_at
            FROM location_points
            WHERE session_id=%s
            ORDER BY recorded_at ASC
            LIMIT 100
            """,
            (session_id,)
        )

        locations = cursor.fetchall()

        # -------------------------------------------------
        # RISK HISTORY
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                risk_score,
                risk_level,
                reason,
                created_at
            FROM risk_events
            WHERE session_id=%s
            ORDER BY created_at ASC
            LIMIT 100
            """,
            (session_id,)
        )

        risk_events = cursor.fetchall()

        # -------------------------------------------------
        # TRUSTED CONTACTS
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                contact_name,
                contact_phone,
                relationship
            FROM trusted_contacts
            WHERE user_id=%s
            ORDER BY id DESC
            """,
            (session["user_id"],)
        )

        trusted_contacts = cursor.fetchall()

        # -------------------------------------------------
        # EMERGENCY ALERTS
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                id,
                alert_type,
                location,
                message,
                status,
                created_at
            FROM emergency_alerts
            WHERE user_id=%s
            ORDER BY created_at DESC
            LIMIT 20
            """,
            (session["user_id"],)
        )

        emergency_alerts = cursor.fetchall()

        return {
            "session": session,
            "locations": locations,
            "risk_events": risk_events,
            "trusted_contacts": trusted_contacts,
            "emergency_alerts": emergency_alerts
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
# ADMIN NOTIFICATIONS
# =========================================================

@router.get("/notifications")
def get_admin_notifications():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                an.id,
                an.user_id,
                an.session_id,
                an.notification_type,
                an.title,
                an.message,
                an.is_read,
                an.created_at,
                u.full_name
            FROM admin_notifications an
            LEFT JOIN users u
                ON u.id = an.user_id
            ORDER BY an.created_at DESC
            LIMIT 100
            """
        )

        notifications = cursor.fetchall()

        unread_count = sum(
            1
            for item in notifications
            if not item["is_read"]
        )

        return {
            "notifications": notifications,
            "unread_count": unread_count
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


@router.patch("/notifications/{notification_id}/read")
def mark_admin_notification_read(
    notification_id: int
):

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE admin_notifications
            SET is_read = 1
            WHERE id = %s
            """,
            (notification_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Notification not found"
            )

        connection.commit()

        return {
            "message": "Notification marked as read"
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


@router.patch("/notifications/read-all")
def mark_all_admin_notifications_read():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE admin_notifications
            SET is_read = 1
            WHERE is_read = 0
            """
        )

        connection.commit()

        return {
            "message": "All notifications marked as read"
        }

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

            
# ... all your existing admin code above ...


# =========================================================
# ADMIN REPORTS
# =========================================================

@router.get("/reports")
def get_admin_reports():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                ms.id AS session_id,
                ms.user_id,
                u.full_name,
                u.email,
                u.phone_number,
                ms.destination,
                ms.status,
                ms.final_risk_score,
                ms.started_at,
                ms.ended_at,
                ms.end_reason
            FROM monitoring_sessions ms
            INNER JOIN users u
                ON u.id = ms.user_id
            ORDER BY ms.started_at DESC
            """
        )

        reports = cursor.fetchall()

        return {
            "total": len(reports),
            "reports": reports
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
# ADMIN ANALYTICS
# =========================================================

@router.get("/analytics")
def get_admin_analytics():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM monitoring_sessions
            """
        )
        total_journeys = cursor.fetchone()["total"] or 0

        cursor.execute(
            """
            SELECT status, COUNT(*) AS total
            FROM monitoring_sessions
            GROUP BY status
            """
        )

        status_rows = cursor.fetchall()

        status_counts = {}

        for row in status_rows:
            if row["status"]:
                status_counts[
                    str(row["status"]).lower()
                ] = row["total"]

        completed = (
            status_counts.get("completed", 0)
            + status_counts.get("safe", 0)
        )

        cancelled = (
            status_counts.get("cancelled", 0)
            + status_counts.get("canceled", 0)
        )

        interrupted = (
            status_counts.get("interrupted", 0)
            + status_counts.get("stopped", 0)
        )

        cursor.execute(
            """
            SELECT COUNT(DISTINCT user_id) AS total
            FROM emergency_alerts
            """
        )
        emergencies = cursor.fetchone()["total"] or 0

        cursor.execute(
            """
            SELECT
                COALESCE(AVG(final_risk_score), 0)
                AS average_risk
            FROM monitoring_sessions
            """
        )

        result = cursor.fetchone()

        average_risk = float(
            result["average_risk"] or 0
        )

        cursor.execute(
            """
            SELECT risk_level, COUNT(*) AS total
            FROM risk_events
            GROUP BY risk_level
            """
        )

        risk_rows = cursor.fetchall()

        risk_distribution = {
            "Low": 0,
            "Medium": 0,
            "High": 0,
            "Critical": 0
        }

        for row in risk_rows:
            level = row["risk_level"]

            if level in risk_distribution:
                risk_distribution[level] = row["total"]

        return {
            "total_journeys": total_journeys,
            "completed": completed,
            "emergencies": emergencies,
            "interrupted": interrupted,
            "cancelled": cancelled,
            "average_risk": round(average_risk, 2),
            "risk_distribution": risk_distribution
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
# ADMIN STATISTICS
# =========================================================

@router.get("/statistics")
def get_admin_statistics():

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS total FROM users")
        total_users = cursor.fetchone()["total"] or 0

        cursor.execute(
            "SELECT COUNT(*) AS total FROM monitoring_sessions"
        )
        total_journeys = cursor.fetchone()["total"] or 0

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM monitoring_sessions
            WHERE LOWER(status)
            IN ('completed', 'safe')
            """
        )
        safe_journeys = cursor.fetchone()["total"] or 0

        cursor.execute(
            """
            SELECT COUNT(DISTINCT user_id) AS total
            FROM emergency_alerts
            """
        )
        emergency_journeys = cursor.fetchone()["total"] or 0

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM monitoring_sessions
            WHERE status='Active'
            """
        )
        active_journeys = cursor.fetchone()["total"] or 0

        cursor.execute(
            "SELECT COUNT(*) AS total FROM emergency_alerts"
        )
        total_alerts = cursor.fetchone()["total"] or 0

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM emergency_alerts
            WHERE status='Active'
            """
        )
        active_alerts = cursor.fetchone()["total"] or 0

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM emergency_alerts
            WHERE status='Resolved'
            """
        )
        resolved_alerts = cursor.fetchone()["total"] or 0

        cursor.execute(
            "SELECT COUNT(*) AS total FROM trusted_contacts"
        )
        trusted_contacts = cursor.fetchone()["total"] or 0

        if total_journeys > 0:
            journey_success_rate = round(
                (safe_journeys / total_journeys) * 100,
                1
            )
        else:
            journey_success_rate = 0

        return {
            "total_users": total_users,
            "total_journeys": total_journeys,
            "safe_journeys": safe_journeys,
            "emergency_journeys": emergency_journeys,
            "active_journeys": active_journeys,
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "resolved_alerts": resolved_alerts,
            "trusted_contacts": trusted_contacts,
            "journey_success_rate": journey_success_rate
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
# DATABASE CONNECTION CHECK
# =========================================================

@router.get("/db-check")
def admin_database_check():

    connection = None
    cursor = None

    try:
        connection = get_database()

        cursor = connection.cursor(
            dictionary=True
        )

        # Which database/server is FastAPI using?
        cursor.execute(
            """
            SELECT
                DATABASE() AS current_database,
                @@hostname AS mysql_host,
                @@port AS mysql_port
            """
        )

        database_info = cursor.fetchone()

        # Does FastAPI see admin_notifications?
        cursor.execute(
            """
            SHOW TABLES
            LIKE 'admin_notifications'
            """
        )

        table_result = cursor.fetchone()

        return {
            "connected": True,

            "current_database":
                database_info[
                    "current_database"
                ],

            "mysql_host":
                database_info[
                    "mysql_host"
                ],

            "mysql_port":
                database_info[
                    "mysql_port"
                ],

            "admin_notifications_exists":
                bool(table_result),

            "table_result":
                table_result
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