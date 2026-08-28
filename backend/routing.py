import os

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

load_dotenv()

router = APIRouter(
    prefix="/routing",
    tags=["Routing"]
)

OPENROUTESERVICE_API_KEY = os.getenv(
    "OPENROUTESERVICE_API_KEY"
)

ORS_URL = (
    "https://api.heigit.org/"
    "openrouteservice/v2/directions/"
    "foot-walking/geojson"
)


class WalkingRouteRequest(BaseModel):
    start_latitude: float
    start_longitude: float
    destination_latitude: float
    destination_longitude: float


@router.post("/walking")
def get_walking_route(
    route_request: WalkingRouteRequest
):
    if not OPENROUTESERVICE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail=(
                "OpenRouteService API key "
                "is not configured."
            )
        )

    coordinates = [
        [
            route_request.start_longitude,
            route_request.start_latitude
        ],
        [
            route_request.destination_longitude,
            route_request.destination_latitude
        ]
    ]

    headers = {
        "Authorization": OPENROUTESERVICE_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/geo+json"
    }

    payload = {
        "coordinates": coordinates,
        "instructions": False,
        "preference": "recommended"
    }

    try:
        response = requests.post(
            ORS_URL,
            json=payload,
            headers=headers,
            timeout=20
        )

    except requests.RequestException as error:
        print(
            "OpenRouteService connection error:",
            error
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to connect to the "
                "walking route service."
            )
        )

    if response.status_code != 200:
        print(
            "OpenRouteService error:",
            response.status_code,
            response.text
        )

        raise HTTPException(
            status_code=response.status_code,
            detail=(
                "Unable to calculate a "
                "walking route."
            )
        )

    try:
        route_data = response.json()
    except ValueError:
        raise HTTPException(
            status_code=502,
            detail=(
                "Invalid response received "
                "from walking route service."
            )
        )

    features = route_data.get(
        "features",
        []
    )

    if not features:
        raise HTTPException(
            status_code=404,
            detail="No walking route was found."
        )

    feature = features[0]

    geometry = feature.get(
        "geometry",
        {}
    )

    properties = feature.get(
        "properties",
        {}
    )

    summary = properties.get(
        "summary",
        {}
    )

    route_coordinates = (
        geometry.get("coordinates", [])
    )

    if not route_coordinates:
        raise HTTPException(
            status_code=404,
            detail=(
                "Walking route geometry "
                "was not returned."
            )
        )

    return {
        "success": True,

        "profile": "foot-walking",

        "distance_metres": summary.get(
            "distance",
            0
        ),

        "duration_seconds": summary.get(
            "duration",
            0
        ),

        "coordinates": route_coordinates
    }