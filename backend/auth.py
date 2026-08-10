from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_database

router = APIRouter()


# ==========================
# User Registration API
# ==========================
@router.post("/register")
def register_user(
    full_name: str,
    email: str,
    password: str,
    phone_number: str
):
    try:
        connection = get_database()
        cursor = connection.cursor()

        query = """
        INSERT INTO users
        (full_name, email, password, phone_number)
        VALUES (%s, %s, %s, %s)
        """

        values = (
            full_name,
            email,
            password,
            phone_number
        )

        cursor.execute(query, values)
        connection.commit()

        cursor.close()
        connection.close()

        return {
            "message": "User registered successfully"
        }

    except Exception as e:
        return {
            "error": str(e)
        }


# ==========================
# User Login API
# ==========================
@router.post("/login")
def login_user(
    email: str,
    password: str
):
    try:
        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        query = """
        SELECT *
        FROM users
        WHERE email = %s
        AND password = %s
        """

        values = (
            email,
            password
        )

        cursor.execute(query, values)

        user = cursor.fetchone()

        cursor.close()
        connection.close()

        if user:
            return {
                "message": "Login successful",
                "user": user
            }

        return {
            "message": "Invalid email or password"
        }

    except Exception as e:
        return {
            "error": str(e)
        }


# ==========================
# Profile Update Model
# ==========================
class ProfileUpdate(BaseModel):
    full_name: str
    phone_number: str


# ==========================
# Update User Profile API
# ==========================
@router.put("/users/{user_id}")
def update_user_profile(
    user_id: int,
    profile: ProfileUpdate
):
    try:

        connection = get_database()
        cursor = connection.cursor(dictionary=True)

        update_query = """
        UPDATE users
        SET
            full_name = %s,
            phone_number = %s
        WHERE id = %s
        """

        cursor.execute(
            update_query,
            (
                profile.full_name,
                profile.phone_number,
                user_id
            )
        )

        connection.commit()

        if cursor.rowcount == 0:

            cursor.close()
            connection.close()

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        select_query = """
        SELECT
            id,
            full_name,
            email,
            phone_number,
            created_at
        FROM users
        WHERE id = %s
        """

        cursor.execute(
            select_query,
            (user_id,)
        )

        updated_user = cursor.fetchone()

        cursor.close()
        connection.close()

        return {
            "message": "Profile updated successfully",
            "user": updated_user
        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )