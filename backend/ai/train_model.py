import os

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)
from sklearn.model_selection import train_test_split


BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATA_FILE = os.path.join(
    BASE_DIR,
    "training_data.csv"
)

MODEL_FILE = os.path.join(
    BASE_DIR,
    "risk_model.pkl"
)


data = pd.read_csv(
    DATA_FILE
)


features = [
    "walking_speed",
    "stationary_seconds",
    "off_route",
    "hour_of_day",
    "is_night",
    "distance_remaining",
    "gps_accuracy",
    "previous_alerts"
]


X = data[features]

y = data["risk_level"]


X_train, X_test, y_train, y_test = (
    train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y
    )
)


model = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    class_weight="balanced"
)


model.fit(
    X_train,
    y_train
)


predictions = model.predict(
    X_test
)


accuracy = accuracy_score(
    y_test,
    predictions
)


print(
    "\nNightGuard AI Model Training Complete"
)

print(
    "\nAccuracy:",
    round(accuracy, 4)
)


print(
    "\nClassification Report:\n"
)

print(
    classification_report(
        y_test,
        predictions,
        zero_division=0
    )
)


print(
    "\nConfusion Matrix:\n"
)

print(
    confusion_matrix(
        y_test,
        predictions
    )
)


print(
    "\nFeature Importance:\n"
)


feature_importances = sorted(
    zip(
        features,
        model.feature_importances_
    ),
    key=lambda item: item[1],
    reverse=True
)


for feature, importance in feature_importances:
    print(
        f"{feature}: "
        f"{importance:.4f}"
    )


joblib.dump(
    {
        "model": model,
        "features": features
    },
    MODEL_FILE
)


print(
    "\nModel saved to:"
)

print(
    MODEL_FILE
)