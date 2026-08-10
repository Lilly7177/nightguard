import os
import smtplib

from email.message import EmailMessage

from dotenv import load_dotenv


load_dotenv()


SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587

SENDER_EMAIL = os.getenv(
    "NIGHTGUARD_EMAIL"
)

SENDER_APP_PASSWORD = os.getenv(
    "NIGHTGUARD_EMAIL_APP_PASSWORD"
)


def send_emergency_email(
    contact_email: str,
    contact_name: str,
    user_name: str,
    alert_type: str,
    location: str | None,
    emergency_message: str | None,
    alert_id: int
):
    if not SENDER_EMAIL:
        raise ValueError(
            "NIGHTGUARD_EMAIL is missing"
        )

    if not SENDER_APP_PASSWORD:
        raise ValueError(
            "NIGHTGUARD_EMAIL_APP_PASSWORD is missing"
        )

    if not contact_email:
        raise ValueError(
            "Trusted contact email is missing"
        )

    safe_location = (
        location or "Location unavailable"
    )

    safe_message = (
        emergency_message
        or "Immediate assistance may be required."
    )

    google_maps_link = ""

    if "," in safe_location:
        coordinates = safe_location.replace(
            " ",
            ""
        )

        google_maps_link = (
            "https://www.google.com/maps/search/"
            f"?api=1&query={coordinates}"
        )

    email = EmailMessage()

    email["From"] = (
        f"NightGuard Emergency <{SENDER_EMAIL}>"
    )

    email["To"] = contact_email

    email["Subject"] = (
        f"🚨 NightGuard Emergency Alert for "
        f"{user_name}"
    )

    plain_text = f"""
NightGuard Emergency Alert

Hello {contact_name},

NightGuard has created an emergency alert for {user_name}.

Alert ID: {alert_id}
Alert Type: {alert_type}
Location: {safe_location}
Message: {safe_message}

Google Maps:
{google_maps_link or "Map link unavailable"}

Please contact {user_name} immediately. If you believe they are in immediate danger, contact the appropriate emergency services.

This is an automated NightGuard safety notification.
"""

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>

<body style="
    margin: 0;
    padding: 0;
    background: #f4f4f5;
    font-family: Arial, sans-serif;
">

    <div style="
        max-width: 650px;
        margin: 30px auto;
        background: #ffffff;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    ">

        <div style="
            background: #111827;
            color: #ffffff;
            padding: 28px;
            text-align: center;
        ">
            <h1 style="
                margin: 0;
                color: #ef4444;
            ">
                🚨 NightGuard Emergency Alert
            </h1>

            <p style="
                margin: 10px 0 0;
                color: #d1d5db;
            ">
                Immediate safety notification
            </p>
        </div>

        <div style="padding: 30px;">

            <p>
                Hello <strong>{contact_name}</strong>,
            </p>

            <p>
                NightGuard has created an emergency alert
                for <strong>{user_name}</strong>.
            </p>

            <div style="
                margin: 24px 0;
                padding: 20px;
                border-radius: 12px;
                background: #fef2f2;
                border: 1px solid #fecaca;
            ">

                <p>
                    <strong>Alert ID:</strong>
                    {alert_id}
                </p>

                <p>
                    <strong>Alert Type:</strong>
                    {alert_type}
                </p>

                <p>
                    <strong>Location:</strong>
                    {safe_location}
                </p>

                <p>
                    <strong>Emergency Message:</strong>
                    {safe_message}
                </p>

            </div>

            {
                f'''
                <div style="text-align: center; margin: 28px 0;">

                    <a
                        href="{google_maps_link}"
                        style="
                            display: inline-block;
                            padding: 14px 24px;
                            border-radius: 10px;
                            background: #2563eb;
                            color: #ffffff;
                            text-decoration: none;
                            font-weight: bold;
                        "
                    >
                        📍 Open Live Location
                    </a>

                </div>
                '''
                if google_maps_link
                else ""
            }

            <p style="
                color: #991b1b;
                font-weight: bold;
            ">
                Please contact {user_name} immediately.
                If you believe they are in immediate danger,
                contact the appropriate emergency services.
            </p>

        </div>

        <div style="
            background: #111827;
            color: #9ca3af;
            padding: 18px;
            text-align: center;
            font-size: 13px;
        ">
            This is an automated NightGuard safety notification.
        </div>

    </div>

</body>
</html>
"""

    email.set_content(
        plain_text
    )

    email.add_alternative(
        html_content,
        subtype="html"
    )

    with smtplib.SMTP(
        SMTP_HOST,
        SMTP_PORT,
        timeout=30
    ) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()

        smtp.login(
            SENDER_EMAIL,
            SENDER_APP_PASSWORD
        )

        smtp.send_message(
            email
        )

    return {
        "success": True,
        "recipient": contact_email
    }