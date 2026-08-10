from typing import Tuple


def calculate_risk(
    walking_speed: float,
    stationary_seconds: int,
    off_route: bool,
    emergency_pressed: bool
) -> Tuple[int, str, str]:

    risk_score = 10
    reason = "Monitoring active"

    # Emergency button
    if emergency_pressed:
        return (
            100,
            "Critical",
            "Emergency alert activated"
        )

    # Walking speed
    if walking_speed < 0.2:
        risk_score += 15

    elif walking_speed < 0.8:
        risk_score += 5

    # Stationary time
    if stationary_seconds >= 300:
        risk_score += 40
        reason = "User stationary for over 5 minutes"

    elif stationary_seconds >= 120:
        risk_score += 20
        reason = "User stationary"

    # Route deviation
    if off_route:
        risk_score += 20
        reason = "User left planned route"

    # Clamp score
    risk_score = max(0, min(100, risk_score))

    # Risk level
    if risk_score < 30:
        level = "Low"

    elif risk_score < 60:
        level = "Medium"

    elif risk_score < 80:
        level = "High"

    else:
        level = "Critical"

    return (
        risk_score,
        level,
        reason
    )