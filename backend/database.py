import os

import mysql.connector
from dotenv import load_dotenv


# Load variables from .env
load_dotenv()


def get_database():
    """
    Create and return a connection to the
    NightGuard MySQL database.
    """

    db_host = os.getenv(
        "DB_HOST",
        "localhost"
    )

    db_port = int(
        os.getenv(
            "DB_PORT",
            "3306"
        )
    )

    db_user = os.getenv(
        "DB_USER"
    )

    db_password = os.getenv(
        "DB_PASSWORD"
    )

    db_name = os.getenv(
        "DB_NAME",
        "nightguard"
    )

    if not db_user:
        raise ValueError(
            "DB_USER is missing from .env"
        )

    if not db_password:
        raise ValueError(
            "DB_PASSWORD is missing from .env"
        )

    connection = mysql.connector.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_password,
        database=db_name
    )

    return connection


def check_database_connection():
    """
    Used for debugging/testing the database
    connection.

    Never prints or returns the database password.
    """

    connection = None
    cursor = None

    try:
        connection = get_database()

        cursor = connection.cursor(
            dictionary=True
        )

        # Check the actual database FastAPI is using
        cursor.execute(
            """
            SELECT
                DATABASE() AS current_database,
                @@hostname AS mysql_host,
                @@port AS mysql_port
            """
        )

        database_info = cursor.fetchone()

        # Check whether our new table exists
        cursor.execute(
            """
            SHOW TABLES
            LIKE 'admin_notifications'
            """
        )

        admin_notifications_table = (
            cursor.fetchone()
        )

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
                bool(
                    admin_notifications_table
                )
        }

    except Exception as error:

        return {
            "connected": False,
            "error": str(error)
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()