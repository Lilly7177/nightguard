import os
from datetime import datetime

import joblib
import pandas as pd


BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODEL_FILE = os.path.join(
    BASE_DIR,
    "risk_model.pkl"
)


model_package = joblib.load(
    MODEL_FILE
)

model = model_package["model"]
features = model_package["features"]


def predict_ml_risk(
    walking_speed: float,
    stationary_seconds: int,
    off_route: bool,
    distance_remaining: float = 0.0,
    gps_accuracy: float = 20.0,
    previous_alerts: int = 0
):
    current_hour = datetime.now().hour

    is_night = (
        1
        if current_hour >= 22
        or current_hour < 6
        else 0
    )

    input_data = pd.DataFrame(
        [
            {
                "walking_speed":
                    walking_speed,

                "stationary_seconds":
                    stationary_seconds,

                "off_route":
                    int(off_route),

                "hour_of_day":
                    current_hour,

                "is_night":
                    is_night,

                "distance_remaining":
                    distance_remaining,

                "gps_accuracy":
                    gps_accuracy,

                "previous_alerts":
                    previous_alerts
            }
        ],
        columns=features
    )

    predicted_level = model.predict(
        input_data
    )[0]

    probabilities = model.predict_proba(
        input_data
    )[0]

    classes = model.classes_

    probability_map = {
        level: round(
            float(probability) * 100,
            2
        )
        for level, probability
        in zip(
            classes,
            probabilities
        )
    }

    confidence = max(
        probability_map.values()
    )

    risk_scores = {
        "Low": 20,
        "Medium": 45,
        "High": 75,
        "Critical": 100
    }

    predicted_score = risk_scores.get(
        predicted_level,
        20
    )

    return {
        "risk_level":
            predicted_level,

        "risk_score":
            predicted_score,

        "confidence":
            confidence,

        "probabilities":
            probability_map,

        "features": {
            "walking_speed":
                walking_speed,

            "stationary_seconds":
                stationary_seconds,

            "off_route":
                off_route,

            "hour_of_day":
                current_hour,

            "is_night":
                bool(is_night),

            "distance_remaining":
                distance_remaining,

            "gps_accuracy":
                gps_accuracy,

            "previous_alerts":
                previous_alerts
        }
    }