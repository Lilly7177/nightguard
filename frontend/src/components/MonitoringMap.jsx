import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";

import L from "leaflet";

import "../styles/MonitoringMap.css";


delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});


const destinationIcon = L.divIcon({
  className: "destination-marker-wrapper",

  html: `
    <div class="destination-marker">
      <span>🏁</span>
    </div>
  `,

  iconSize: [44, 44],
  iconAnchor: [22, 42],
  popupAnchor: [0, -40]
});


const userIcon = L.divIcon({
  className: "live-user-marker-wrapper",

  html: `
    <div class="live-user-marker">
      <div class="live-user-marker-pulse"></div>
      <div class="live-user-marker-dot"></div>
    </div>
  `,

  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -18]
});


function calculateDistanceMetres(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadius = 6371000;

  const toRadians = (value) =>
    (value * Math.PI) / 180;

  const latitudeDifference = toRadians(
    latitude2 - latitude1
  );

  const longitudeDifference = toRadians(
    longitude2 - longitude1
  );

  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


function MapViewUpdater({
  currentPosition,
  destinationPosition,
  routeCoordinates
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates.length > 1) {
      map.fitBounds(routeCoordinates, {
        padding: [45, 45]
      });

      return;
    }

    if (
      currentPosition &&
      destinationPosition
    ) {
      map.fitBounds(
        [
          currentPosition,
          destinationPosition
        ],
        {
          padding: [45, 45]
        }
      );

      return;
    }

    if (destinationPosition) {
      map.setView(
        destinationPosition,
        15
      );

      return;
    }

    if (currentPosition) {
      map.setView(
        currentPosition,
        16
      );
    }
  }, [
    map,
    currentPosition,
    destinationPosition,
    routeCoordinates
  ]);

  return null;
}


function MonitoringMap({
  destination,
  currentLocation,
  monitoringActive = false,
  requestingLocation = false,
  onTotalDistanceChange,
  onRemainingDistanceChange,
  onOffRouteChange
}) {
  const [
    routeCoordinates,
    setRouteCoordinates
  ] = useState([]);

  const [
    completedCoordinates,
    setCompletedCoordinates
  ] = useState([]);

  const [
    routeInformation,
    setRouteInformation
  ] = useState({
    distance: null,
    walkingDuration: null
  });

  const [loadingRoute, setLoadingRoute] =
    useState(false);

  const [routeError, setRouteError] =
    useState("");

  const initialDistanceRef =
    useRef(null);

  const lastRoutePositionRef =
    useRef(null);

  const lastDestinationRef =
    useRef(null);


  const currentPosition = useMemo(() => {
    if (!currentLocation) {
      return null;
    }

    return [
      Number(currentLocation.latitude),
      Number(currentLocation.longitude)
    ];
  }, [
    currentLocation?.latitude,
    currentLocation?.longitude
  ]);


  const destinationPosition =
    useMemo(() => {
      if (!destination) {
        return null;
      }

      return [
        Number(destination.latitude),
        Number(destination.longitude)
      ];
    }, [
      destination?.latitude,
      destination?.longitude
    ]);


  const defaultMapPosition = [
    51.8787,
    -0.42
  ];


  useEffect(() => {
    const loadRoute = async () => {
      if (
        !currentPosition ||
        !destinationPosition
      ) {
        setRouteCoordinates([]);
        setCompletedCoordinates([]);

        setRouteInformation({
          distance: null,
          walkingDuration: null
        });

        initialDistanceRef.current =
          null;

        lastRoutePositionRef.current =
          null;

        lastDestinationRef.current =
          null;

        onRemainingDistanceChange?.(0);
        onTotalDistanceChange?.(0);

        return;
      }


      const destinationKey =
        `${destinationPosition[0]},` +
        `${destinationPosition[1]}`;


      const destinationChanged =
        lastDestinationRef.current !==
        destinationKey;


      if (
        !destinationChanged &&
        lastRoutePositionRef.current
      ) {
        const movementSinceLastRoute =
          calculateDistanceMetres(
            lastRoutePositionRef.current[0],
            lastRoutePositionRef.current[1],
            currentPosition[0],
            currentPosition[1]
          );

        if (movementSinceLastRoute < 5) {
          return;
        }
      }


      try {
        setLoadingRoute(true);
        setRouteError("");


        const currentLatitude =
          currentPosition[0];

        const currentLongitude =
          currentPosition[1];

        const destinationLatitude =
          destinationPosition[0];

        const destinationLongitude =
          destinationPosition[1];


        const routeUrl =
          "https://router.project-osrm.org/route/v1/driving/" +
          `${currentLongitude},${currentLatitude};` +
          `${destinationLongitude},${destinationLatitude}` +
          "?overview=full&geometries=geojson&steps=false";


        const response =
          await fetch(routeUrl);


        if (!response.ok) {
          throw new Error(
            "Route request failed"
          );
        }


        const routeData =
          await response.json();


        if (
          routeData.code !== "Ok" ||
          !routeData.routes ||
          routeData.routes.length === 0
        ) {
          throw new Error(
            "No route was found"
          );
        }


        const route =
          routeData.routes[0];


        const leafletCoordinates =
          route.geometry.coordinates.map(
            ([longitude, latitude]) => [
              latitude,
              longitude
            ]
          );


        const walkingSpeedMetresPerSecond =
          1.34;


        const walkingDuration =
          route.distance /
          walkingSpeedMetresPerSecond;


        let nearestIndex = 0;
        let nearestDistance =
          Number.MAX_VALUE;


        leafletCoordinates.forEach(
          (point, index) => {
            const distanceToPoint =
              calculateDistanceMetres(
                currentPosition[0],
                currentPosition[1],
                point[0],
                point[1]
              );

            if (
              distanceToPoint <
              nearestDistance
            ) {
              nearestDistance =
                distanceToPoint;

              nearestIndex =
                index;
            }
          }
        );


        const completedRoute =
          leafletCoordinates.slice(
            0,
            nearestIndex + 1
          );


        const remainingRoute =
  leafletCoordinates.slice(
    nearestIndex
  );

const distanceFromRoute =
  nearestDistance;

const userOffRoute =
  distanceFromRoute > 30;

onOffRouteChange?.(
  userOffRoute
);

setCompletedCoordinates(
  completedRoute
);

setRouteCoordinates(
  remainingRoute
);

        setRouteInformation({
          distance: route.distance,
          walkingDuration
        });


        const remainingDistanceMiles =
          route.distance / 1609.344;


        onRemainingDistanceChange?.(
          remainingDistanceMiles
        );


        if (
          initialDistanceRef.current ===
            null ||
          destinationChanged
        ) {
          initialDistanceRef.current =
            remainingDistanceMiles;

          onTotalDistanceChange?.(
            remainingDistanceMiles
          );
        }


        lastRoutePositionRef.current = [
          currentPosition[0],
          currentPosition[1]
        ];

        lastDestinationRef.current =
          destinationKey;
      } catch (error) {
        console.error(
          "Route calculation error:",
          error
        );

        setRouteCoordinates([]);
        setCompletedCoordinates([]);

        setRouteInformation({
          distance: null,
          walkingDuration: null
        });

        setRouteError(
          "Unable to calculate the walking route to this destination."
        );
      } finally {
        setLoadingRoute(false);
      }
    };


    loadRoute();
  }, [
    currentPosition,
    destinationPosition,
    onRemainingDistanceChange,
    onTotalDistanceChange
  ]);


  const formatDistance = (
    distanceInMetres
  ) => {
    if (distanceInMetres === null) {
      return "Not available";
    }

    const miles =
      distanceInMetres / 1609.344;

    const kilometres =
      distanceInMetres / 1000;

    return (
      `${miles.toFixed(1)} miles ` +
      `(${kilometres.toFixed(1)} km)`
    );
  };


  const formatWalkingDuration = (
    durationInSeconds
  ) => {
    if (durationInSeconds === null) {
      return "Not available";
    }

    const totalMinutes = Math.max(
      1,
      Math.ceil(
        durationInSeconds / 60
      )
    );

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    }

    const hours =
      Math.floor(totalMinutes / 60);

    const minutes =
      totalMinutes % 60;

    if (minutes === 0) {
      return (
        `${hours} hour` +
        `${hours > 1 ? "s" : ""}`
      );
    }

    return `${hours} hr ${minutes} min`;
  };

    if (!destinationPosition) {
  return null;
}


  return (
    <section className="monitoring-map-section">


      <div className="map-wrapper">

        <MapContainer
          center={
            currentPosition ||
            destinationPosition
          }
          zoom={
            currentPosition
              ? 16
              : 15
          }
          scrollWheelZoom={true}
          className="leaflet-map"
        >

          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          {currentPosition && (
            <Marker
              position={currentPosition}
              icon={userIcon}
            >

              <Popup>

                <strong>
                  🔵 Your live location
                </strong>

                <br />

                Latitude:{" "}
                {currentPosition[0].toFixed(6)}

                <br />

                Longitude:{" "}
                {currentPosition[1].toFixed(6)}

              </Popup>

            </Marker>
          )}


          <Marker
            position={destinationPosition}
            icon={destinationIcon}
          >

            <Popup>

              <strong>
                🏁 Walking destination
              </strong>

              <br />

              {destination.display_name}

            </Popup>

          </Marker>


          {completedCoordinates.length > 1 && (
            <Polyline
              positions={completedCoordinates}
              pathOptions={{
                color: "#9ca3af",
                weight: 7,
                opacity: 0.8,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
          )}


          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#2563eb",
                weight: 7,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
          )}


          <MapViewUpdater
            currentPosition={currentPosition}
            destinationPosition={
              destinationPosition
            }
            routeCoordinates={
              routeCoordinates
            }
          />

        </MapContainer>


        <div className="map-legend">

          {currentPosition && (
            <div>
              <span className="legend-user-dot">
              </span>

              Your live location
            </div>
          )}


          {completedCoordinates.length > 1 && (
            <div>
              <span
                className="legend-route-line"
                style={{
                  background: "#9ca3af"
                }}
              ></span>

              Completed route
            </div>
          )}


          {routeCoordinates.length > 1 && (
            <div>
              <span className="legend-route-line">
              </span>

              Remaining walking route
            </div>
          )}


          <div>
            <span className="legend-destination-dot">
              🏁
            </span>

            Destination
          </div>

        </div>

      </div>


      {requestingLocation && (
        <div className="route-message">

          <span className="route-loading-dot">
          </span>

          Waiting for location permission...

        </div>
      )}


      {loadingRoute && (
        <div className="route-message">

          <span className="route-loading-dot">
          </span>

          Calculating your walking route...

        </div>
      )}


      {routeError && (
        <div className="route-message route-error">
          {routeError}
        </div>
      )}



      {routeCoordinates.length > 1 && (
  <div className="route-summary">

    <div className="route-summary-card">
      <span>🚶 Distance</span>

      <strong>
        {formatDistance(
          routeInformation.distance
        )}
      </strong>
    </div>

    <div className="route-summary-card">
      <span>⏱ Estimated Time</span>

      <strong>
        {formatWalkingDuration(
          routeInformation.walkingDuration
        )}
      </strong>
    </div>

  </div>
)}

    </section>
  );
}

export default MonitoringMap;