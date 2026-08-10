from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_database
from email_service import send_emergency_email


router = APIRouter(
    prefix="/alerts",
    tags=["Emergency Alerts"]
)


class AlertCreate(BaseModel):
    user_id: int
    alert_type: str
    location: str | None = None
    message: str | None = None


class AlertStatusUpdate(BaseModel):
    status: str


@router.post("")
def create_alert(alert: AlertCreate):
    connection = None
    cursor = None

    try:
        connection = get_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                phone_number
            FROM users
            WHERE id = %s
            """,
            (alert.user_id,)
        )

        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        cursor.execute(
            """
            INSERT INTO emergency_alerts
            (
                user_id,
                alert_type,
                location,
                message,
                status
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                alert.user_id,
                alert.alert_type,
                alert.location,
                alert.message,
                "Active"
            )
        )

        alert_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT
                id,
                contact_name,
                contact_phone,
                contact_email,
                relationship
            FROM trusted_contacts
            WHERE user_id = %s
            """,
            (alert.user_id,)
        )

        trusted_contacts = cursor.fetchall()

        notification_message = (
            f"NightGuard emergency alert for "
            f"{user['full_name']}. "
            f"Alert type: {alert.alert_type}. "
            f"Location: "
            f"{alert.location or 'Not available'}. "
            f"Message: "
            f"{alert.message or 'Emergency assistance required.'}"
        )

        created_notifications = []

        for contact in trusted_contacts:
            delivery_status = "Pending"

            try:
                send_emergency_email(
                    contact_email=contact[
                        "contact_email"
                    ],
                    contact_name=contact[
                        "contact_name"
                    ],
                    user_name=user["full_name"],
                    alert_type=alert.alert_type,
                    location=alert.location,
                    emergency_message=alert.message,
                    alert_id=alert_id
                )

                delivery_status = "Sent"

            except Exception as email_error:
                print(
                    "Email sending failed:",
                    email_error
                )

                delivery_status = "Failed"

            cursor.execute(
                """
                INSERT INTO contact_notifications
                (
                    alert_id,
                    contact_id,
                    contact_name,
                    contact_phone,
                    message,
                    delivery_status
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    alert_id,
                    contact["id"],
                    contact["contact_name"],
                    contact["contact_phone"],
                    notification_message,
                    delivery_status
                )
            )

            created_notifications.append(
                {
                    "notification_id":
                        cursor.lastrowid,

                    "contact_id":
                        contact["id"],

                    "contact_name":
                        contact["contact_name"],

                    "contact_phone":
                        contact["contact_phone"],

                    "contact_email":
                        contact["contact_email"],

                    "relationship":
                        contact["relationship"],

                    "delivery_status":
                        delivery_status
                }
            )

        connection.commit()

        return {
            "message":
                "Emergency alert created successfully",

            "alert_id":
                alert_id,

            "status":
                "Active",

            "trusted_contacts_found":
                len(trusted_contacts),

            "notifications_created":
                len(created_notifications),

            "contact_notifications":
                created_notifications
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


@router.get("/user/{user_id}")
def get_user_alerts(user_id: int):
    connection = None
    cursor = None

    try:
        connection = get_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT *
            FROM emergency_alerts
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user_id,)
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


@router.get("/{alert_id}/notifications")
def get_alert_notifications(alert_id: int):
    connection = None
    cursor = None

    try:
        connection = get_database()

        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT
                id,
                alert_id,
                contact_id,
                contact_name,
                contact_phone,
                message,
                delivery_status,
                created_at
            FROM contact_notifications
            WHERE alert_id = %s
            ORDER BY created_at DESC
            """,
            (alert_id,)
        )

        notifications = cursor.fetchall()

        return {
            "alert_id": alert_id,
            "notifications": notifications
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


@router.patch("/{alert_id}/status")
def update_alert_status(
    alert_id: int,
    update: AlertStatusUpdate
):
    allowed_statuses = [
        "Active",
        "Resolved",
        "Cancelled"
    ]

    if update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be Active, "
                "Resolved or Cancelled"
            )
        )

    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE emergency_alerts
            SET status = %s
            WHERE id = %s
            """,
            (
                update.status,
                alert_id
            )
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Alert not found"
            )

        connection.commit()

        return {
            "message":
                "Alert status updated successfully",

            "alert_id":
                alert_id,

            "status":
                update.status
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