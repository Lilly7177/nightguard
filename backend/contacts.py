from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from database import get_database


router = APIRouter(
    prefix="/contacts",
    tags=["Trusted Contacts"]
)


class ContactCreate(BaseModel):
    user_id: int
    contact_name: str
    contact_phone: str
    contact_email: EmailStr
    relationship: str


@router.post("")
def add_contact(contact: ContactCreate):
    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor(
            dictionary=True
        )

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE id = %s
            """,
            (contact.user_id,)
        )

        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        cursor.execute(
            """
            SELECT id
            FROM trusted_contacts
            WHERE user_id = %s
            AND (
                contact_phone = %s
                OR contact_email = %s
            )
            LIMIT 1
            """,
            (
                contact.user_id,
                contact.contact_phone,
                contact.contact_email
            )
        )

        existing_contact = cursor.fetchone()

        if existing_contact:
            raise HTTPException(
                status_code=400,
                detail=(
                    "A trusted contact with this "
                    "phone number or email already exists"
                )
            )

        cursor.execute(
            """
            INSERT INTO trusted_contacts
            (
                user_id,
                contact_name,
                contact_phone,
                contact_email,
                relationship
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                contact.user_id,
                contact.contact_name,
                contact.contact_phone,
                contact.contact_email,
                contact.relationship
            )
        )

        connection.commit()

        contact_id = cursor.lastrowid

        return {
            "message":
                "Trusted contact added successfully",
            "contact": {
                "id": contact_id,
                "user_id":
                    contact.user_id,
                "contact_name":
                    contact.contact_name,
                "contact_phone":
                    contact.contact_phone,
                "contact_email":
                    contact.contact_email,
                "relationship":
                    contact.relationship
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


@router.get("/{user_id}")
def get_contacts(user_id: int):
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
                user_id,
                contact_name,
                contact_phone,
                contact_email,
                relationship
            FROM trusted_contacts
            WHERE user_id = %s
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


@router.delete("/{contact_id}")
def delete_contact(contact_id: int):
    connection = None
    cursor = None

    try:
        connection = get_database()
        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM trusted_contacts
            WHERE id = %s
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
            "message":
                "Trusted contact deleted successfully",
            "contact_id":
                contact_id
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