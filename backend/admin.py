from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_database

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# =====================================
# Models
# =====================================

class AdminLogin(BaseModel):
    email: str
    password: str


# =====================================
# Admin Login
# =====================================

@router.post("/login")
def admin_login(admin: AdminLogin):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT *
        FROM admins
        WHERE email=%s
        AND password=%s
        """

        cursor.execute(
            query,
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


# =====================================
# Dashboard Statistics
# =====================================

@router.get("/dashboard")
def admin_dashboard():

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS total FROM users")
        users = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM emergency_alerts")
        alerts = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM emergency_alerts
            WHERE status='Active'
        """)
        active = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM emergency_alerts
            WHERE status='Resolved'
        """)
        resolved = cursor.fetchone()["total"]

        return {
            "users": users,
            "alerts": alerts,
            "active": active,
            "resolved": resolved
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


# =====================================
# Get All Users
# =====================================

@router.get("/users")
def get_all_users():

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT
            id,
            full_name,
            email,
            phone_number,
            created_at
        FROM users
        ORDER BY id DESC
        """

        cursor.execute(query)

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


# =====================================
# Get All Emergency Alerts
# =====================================

@router.get("/alerts")
def get_all_alerts():

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT
            emergency_alerts.id,
            users.full_name,
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

        cursor.execute(query)

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


# =====================================
# Update Alert Status
# =====================================

@router.put("/alerts/{alert_id}")
def update_alert_status(alert_id: int, status: str):

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor()

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
# Get All Trusted Contacts
# =====================================

@router.get("/contacts")
def get_all_contacts():

    connection = None
    cursor = None

    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        query = """
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

        cursor.execute(query)

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