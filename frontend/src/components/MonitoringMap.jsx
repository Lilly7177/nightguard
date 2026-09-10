import {
  useCallback,
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
  useMap,
  useMapEvents
} from "react-leaflet";

import L from "leaflet";

import "../styles/MonitoringMap.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const WALKING_ROUTE_ENDPOINT = `${API_BASE_URL}/routing/walking`;

const FOLLOW_ZOOM = 18;
const OFF_ROUTE_ENTER_METRES = 30;
const OFF_ROUTE_EXIT_METRES = 18;
const OFF_ROUTE_MIN_FIXES = 3;
const OFF_ROUTE_SUSTAINED_MS = 10000;
const REROUTE_COOLDOWN_MS = 15000;

const METRES_PER_MILE = 1609.344;
const EARTH_RADIUS_METRES = 6371000;

// -----------------------------------------------------------------------------
// Leaflet marker setup
// -----------------------------------------------------------------------------

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
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -18]
});

// -----------------------------------------------------------------------------
// Geometry helpers
// -----------------------------------------------------------------------------

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMetres(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const latitudeDifference = toRadians(latitude2 - latitude1);
  const longitudeDifference = toRadians(longitude2 - longitude1);
  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  return EARTH_RADIUS_METRES * c;
}

function buildCumulativeDistances(routeCoordinates) {
  if (routeCoordinates.length === 0) {
    return [];
  }

  const cumulative = [0];

  for (let index = 1; index < routeCoordinates.length; index += 1) {
    const previous = routeCoordinates[index - 1];
    const current = routeCoordinates[index];

    cumulative[index] =
      cumulative[index - 1] +
      calculateDistanceMetres(
        previous[0],
        previous[1],
        current[0],
        current[1]
      );
  }

  return cumulative;
}

function projectPositionOntoRoute(
  currentPosition,
  routeCoordinates,
  cumulativeDistances
) {
  if (!currentPosition || routeCoordinates.length === 0) {
    return null;
  }

  if (routeCoordinates.length === 1) {
    return {
      distanceToRouteMetres: calculateDistanceMetres(
        currentPosition[0],
        currentPosition[1],
        routeCoordinates[0][0],
        routeCoordinates[0][1]
      ),
      distanceAlongRouteMetres: 0,
      segmentIndex: 0,
      segmentFraction: 0,
      projectedPosition: routeCoordinates[0]
    };
  }

  const referenceLatitudeRadians = toRadians(currentPosition[0]);
  const metresPerDegreeLatitude = 111320;
  const metresPerDegreeLongitude =
    111320 * Math.max(0.01, Math.cos(referenceLatitudeRadians));

  const toLocalPoint = ([latitude, longitude]) => ({
    x: (longitude - currentPosition[1]) * metresPerDegreeLongitude,
    y: (latitude - currentPosition[0]) * metresPerDegreeLatitude
  });

  let bestProjection = null;

  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const start = toLocalPoint(routeCoordinates[index]);
    const end = toLocalPoint(routeCoordinates[index + 1]);

    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

    let fraction = 0;

    if (segmentLengthSquared > 0) {
      fraction =
        -(start.x * segmentX + start.y * segmentY) /
        segmentLengthSquared;
      fraction = Math.max(0, Math.min(1, fraction));
    }

    const projectedX = start.x + fraction * segmentX;
    const projectedY = start.y + fraction * segmentY;
    const distanceToRouteMetres = Math.hypot(projectedX, projectedY);

    if (
      !bestProjection ||
      distanceToRouteMetres < bestProjection.distanceToRouteMetres
    ) {
      const segmentStart = routeCoordinates[index];
      const segmentEnd = routeCoordinates[index + 1];

      const projectedLatitude =
        segmentStart[0] +
        fraction * (segmentEnd[0] - segmentStart[0]);
      const projectedLongitude =
        segmentStart[1] +
        fraction * (segmentEnd[1] - segmentStart[1]);

      const segmentLength =
        cumulativeDistances[index + 1] - cumulativeDistances[index];

      bestProjection = {
        distanceToRouteMetres,
        distanceAlongRouteMetres:
          cumulativeDistances[index] + fraction * segmentLength,
        segmentIndex: index,
        segmentFraction: fraction,
        projectedPosition: [projectedLatitude, projectedLongitude]
      };
    }
  }

  return bestProjection;
}

function createVisibleRoute(
  currentPosition,
  routeCoordinates,
  projection
) {
  if (!routeCoordinates.length) {
    return [];
  }

  if (!currentPosition || !projection) {
    return routeCoordinates;
  }

  const nextRouteIndex = Math.min(
    projection.segmentIndex + 1,
    routeCoordinates.length - 1
  );

  const remaining = routeCoordinates.slice(nextRouteIndex);

  // When GPS is close to the route, start the line at the live marker so the
  // route visually follows the walker. If the user is genuinely off-route,
  // keep the old route separate until the clean reroute replaces it.
  if (projection.distanceToRouteMetres <= OFF_ROUTE_ENTER_METRES) {
    return [
      currentPosition,
      projection.projectedPosition,
      ...remaining
    ];
  }

  return [projection.projectedPosition, ...remaining];
}

// -----------------------------------------------------------------------------
// Backend response helpers
// -----------------------------------------------------------------------------

function normaliseCoordinates(rawCoordinates) {
  if (!Array.isArray(rawCoordinates)) {
    return [];
  }

  return rawCoordinates
    .filter(
      (coordinate) =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(Number(coordinate[0])) &&
        Number.isFinite(Number(coordinate[1]))
    )
    .map(([longitude, latitude]) => [
      Number(latitude),
      Number(longitude)
    ]);
}

function normaliseWalkingRoute(data) {
  const root = data?.route ?? data;
  const feature =
    root?.features?.[0] ??
    data?.features?.[0] ??
    root?.feature ??
    data?.feature ??
    null;

  const rawCoordinates =
    feature?.geometry?.coordinates ??
    root?.geometry?.coordinates ??
    data?.geometry?.coordinates ??
    root?.coordinates ??
    data?.coordinates ??
    [];

  const coordinates = normaliseCoordinates(rawCoordinates);

  const summary =
    feature?.properties?.summary ??
    root?.properties?.summary ??
    root?.summary ??
    data?.summary ??
    {};

  const distance = Number(
    root?.distance_metres ??
      data?.distance_metres ??
      root?.distance ??
      data?.distance ??
      summary?.distance ??
      feature?.properties?.segments?.[0]?.distance
  );

  const duration = Number(
    root?.duration_seconds ??
      data?.duration_seconds ??
      root?.duration ??
      data?.duration ??
      summary?.duration ??
      feature?.properties?.segments?.[0]?.duration
  );

  if (coordinates.length < 2) {
    throw new Error("The walking route did not contain usable geometry.");
  }

  const geometryDistance =
    buildCumulativeDistances(coordinates).at(-1) ?? 0;

  return {
    coordinates,
    distanceMetres:
      Number.isFinite(distance) && distance > 0
        ? distance
        : geometryDistance,
    durationSeconds:
      Number.isFinite(duration) && duration > 0
        ? duration
        : geometryDistance / 1.34
  };
}

async function readApiError(response) {
  try {
    const errorData = await response.json();

    if (typeof errorData?.detail === "string") {
      return errorData.detail;
    }

    if (Array.isArray(errorData?.detail)) {
      return errorData.detail
        .map((item) => item?.msg)
        .filter(Boolean)
        .join(", ");
    }

    if (typeof errorData?.message === "string") {
      return errorData.message;
    }
  } catch {
    // Ignore JSON parsing failure and use the status text below.
  }

  return response.statusText || "Walking route request failed";
}

async function postWalkingRoute(
  currentPosition,
  destinationPosition,
  signal
) {
  const [currentLatitude, currentLongitude] = currentPosition;
  const [destinationLatitude, destinationLongitude] = destinationPosition;

  /*
   * Exact FastAPI WalkingRouteRequest payload.
   * One route calculation = one POST request.
   */
  const payload = {
    start_latitude: currentLatitude,
    start_longitude: currentLongitude,
    destination_latitude: destinationLatitude,
    destination_longitude: destinationLongitude
  };

  const response = await fetch(WALKING_ROUTE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const message = await readApiError(response);
    throw new Error(message);
  }

  const data = await response.json();
  return normaliseWalkingRoute(data);
}

// -----------------------------------------------------------------------------
// Map behaviour
// -----------------------------------------------------------------------------

function MapController({
  currentPosition,
  destinationPosition,
  routeCoordinates,
  monitoringActive,
  followMode,
  onFollowModeChange
}) {
  const map = useMap();
  const previewFittedRef = useRef(false);

  useMapEvents({
    dragstart() {
      onFollowModeChange(false);
    },
    zoomstart(event) {
      if (event?.originalEvent) {
        onFollowModeChange(false);
      }
    }
  });

  useEffect(() => {
    if (!monitoringActive) {
      previewFittedRef.current = false;
    }
  }, [monitoringActive]);

  useEffect(() => {
    if (!currentPosition) {
      return;
    }

    if (monitoringActive && followMode) {
      const currentZoom = map.getZoom();
      const targetZoom =
        currentZoom >= 17 && currentZoom <= 18
          ? currentZoom
          : FOLLOW_ZOOM;

      map.flyTo(currentPosition, targetZoom, {
        animate: true,
        duration: 0.7
      });

      return;
    }

    if (monitoringActive) {
      return;
    }

    if (
      routeCoordinates.length > 1 &&
      !previewFittedRef.current
    ) {
      map.fitBounds(routeCoordinates, {
        padding: [42, 42],
        maxZoom: 16
      });
      previewFittedRef.current = true;
      return;
    }

    if (
      destinationPosition &&
      !previewFittedRef.current
    ) {
      map.fitBounds([currentPosition, destinationPosition], {
        padding: [42, 42],
        maxZoom: 16
      });
      previewFittedRef.current = true;
    }
  }, [
    currentPosition,
    destinationPosition,
    followMode,
    map,
    monitoringActive,
    routeCoordinates
  ]);

  return null;
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

function MonitoringMap({
  destination,
  currentLocation,
  monitoringActive = false,
  requestingLocation = false,
  onTotalDistanceChange,
  onRemainingDistanceChange,
  onOffRouteChange
}) {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInformation, setRouteInformation] = useState({
    distanceMetres: null,
    durationSeconds: null
  });
  const [stableRemainingMetres, setStableRemainingMetres] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [followMode, setFollowMode] = useState(true);
  const [routeRevision, setRouteRevision] = useState(0);

  const abortControllerRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const initialDistanceRef = useRef(null);
  const destinationKeyRef = useRef(null);
  const initialRouteRequestedRef = useRef(false);
  const maximumProgressRef = useRef(0);
  const lastRerouteAtRef = useRef(0);
  const offRouteStartedAtRef = useRef(null);
  const offRouteFixesRef = useRef(0);
  const offRouteActiveRef = useRef(false);
  const reroutePendingRef = useRef(false);

  const currentPosition = useMemo(() => {
    if (!currentLocation) {
      return null;
    }

    const latitude = Number(currentLocation.latitude);
    const longitude = Number(currentLocation.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return [latitude, longitude];
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const destinationPosition = useMemo(() => {
    if (!destination) {
      return null;
    }

    const latitude = Number(destination.latitude);
    const longitude = Number(destination.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return [latitude, longitude];
  }, [destination?.latitude, destination?.longitude]);

  const cumulativeRouteDistances = useMemo(
    () => buildCumulativeDistances(routeCoordinates),
    [routeCoordinates]
  );

  const currentProjection = useMemo(
    () =>
      projectPositionOntoRoute(
        currentPosition,
        routeCoordinates,
        cumulativeRouteDistances
      ),
    [currentPosition, routeCoordinates, cumulativeRouteDistances]
  );

  const visibleRouteCoordinates = useMemo(
    () =>
      createVisibleRoute(
        currentPosition,
        routeCoordinates,
        currentProjection
      ),
    [currentPosition, routeCoordinates, currentProjection]
  );

  const clearOffRouteState = useCallback(() => {
    offRouteStartedAtRef.current = null;
    offRouteFixesRef.current = 0;
    reroutePendingRef.current = false;

    if (offRouteActiveRef.current) {
      offRouteActiveRef.current = false;
      onOffRouteChange?.(false);
    }
  }, [onOffRouteChange]);

  const requestRoute = useCallback(
    async ({ reason = "initial" } = {}) => {
      if (!currentPosition || !destinationPosition) {
        return;
      }

      const requestId = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestId;

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoadingRoute(true);
        setRouteError("");

        const route = await postWalkingRoute(
          currentPosition,
          destinationPosition,
          controller.signal
        );

        if (requestId !== requestSequenceRef.current) {
          return;
        }

        setRouteCoordinates(route.coordinates);
        setRouteInformation({
          distanceMetres: route.distanceMetres,
          durationSeconds: route.durationSeconds
        });
        setStableRemainingMetres(route.distanceMetres);
        setRouteRevision((value) => value + 1);

        maximumProgressRef.current = 0;

        const remainingMiles = route.distanceMetres / METRES_PER_MILE;
        onRemainingDistanceChange?.(remainingMiles);

        if (initialDistanceRef.current === null) {
          initialDistanceRef.current = route.distanceMetres;
          onTotalDistanceChange?.(remainingMiles);
        }

        if (reason === "off-route") {
          lastRerouteAtRef.current = Date.now();
        }

        clearOffRouteState();
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Walking route calculation error:", error);

        setRouteError(
          error?.message ||
            "Unable to calculate the pedestrian route to this destination."
        );

        if (reason === "off-route") {
          reroutePendingRef.current = false;
        }
      } finally {
        if (requestId === requestSequenceRef.current) {
          setLoadingRoute(false);
        }
      }
    }, [
      clearOffRouteState,
      currentPosition,
      destinationPosition,
      onRemainingDistanceChange,
      onTotalDistanceChange
    ]
  );

  // Reset route state only when the destination itself changes.
  useEffect(() => {
    if (!destinationPosition) {
      destinationKeyRef.current = null;
      initialRouteRequestedRef.current = false;
      initialDistanceRef.current = null;
      maximumProgressRef.current = 0;
      setRouteCoordinates([]);
      setStableRemainingMetres(null);
      setRouteInformation({
        distanceMetres: null,
        durationSeconds: null
      });
      onRemainingDistanceChange?.(0);
      onTotalDistanceChange?.(0);
      clearOffRouteState();
      return;
    }

    const destinationKey = `${destinationPosition[0]},${destinationPosition[1]}`;

    if (destinationKeyRef.current !== destinationKey) {
      destinationKeyRef.current = destinationKey;
      initialRouteRequestedRef.current = false;
      initialDistanceRef.current = null;
      maximumProgressRef.current = 0;
      lastRerouteAtRef.current = 0;
      setRouteCoordinates([]);
      setStableRemainingMetres(null);
      setRouteInformation({
        distanceMetres: null,
        durationSeconds: null
      });
      clearOffRouteState();
    }
  }, [
    clearOffRouteState,
    destinationPosition,
    onRemainingDistanceChange,
    onTotalDistanceChange
  ]);

  // Fetch only the initial route. Normal GPS movement does not trigger this.
  useEffect(() => {
    if (
      currentPosition &&
      destinationPosition &&
      routeCoordinates.length === 0 &&
      !loadingRoute &&
      !initialRouteRequestedRef.current
    ) {
      initialRouteRequestedRef.current = true;
      requestRoute({ reason: "initial" });
    }
  }, [
    currentPosition,
    destinationPosition,
    loadingRoute,
    requestRoute,
    routeCoordinates.length
  ]);

  // Calculate progress and remaining distance locally from the existing route.
  useEffect(() => {
    if (
      !currentProjection ||
      routeCoordinates.length < 2 ||
      routeInformation.distanceMetres === null
    ) {
      return;
    }

    const geometryLengthMetres =
      cumulativeRouteDistances.at(-1) ?? 0;

    if (geometryLengthMetres <= 0) {
      return;
    }

    const clampedProgress = Math.max(
      0,
      Math.min(
        geometryLengthMetres,
        currentProjection.distanceAlongRouteMetres
      )
    );

    // Prevent GPS jitter from making remaining distance repeatedly rise/fall.
    maximumProgressRef.current = Math.max(
      maximumProgressRef.current,
      clampedProgress
    );

    const progressRatio = Math.min(
      1,
      maximumProgressRef.current / geometryLengthMetres
    );

    const remainingMetres = Math.max(
      0,
      routeInformation.distanceMetres * (1 - progressRatio)
    );

    setStableRemainingMetres(remainingMetres);
    onRemainingDistanceChange?.(
      remainingMetres / METRES_PER_MILE
    );
  }, [
    cumulativeRouteDistances,
    currentProjection,
    onRemainingDistanceChange,
    routeCoordinates.length,
    routeInformation.distanceMetres,
    routeRevision
  ]);

  // Sustained off-route detection with hysteresis and reroute cooldown.
  useEffect(() => {
    if (
      !monitoringActive ||
      !currentProjection ||
      routeCoordinates.length < 2
    ) {
      return;
    }

    const distanceFromRoute = currentProjection.distanceToRouteMetres;
    const now = Date.now();

    if (distanceFromRoute <= OFF_ROUTE_EXIT_METRES) {
      clearOffRouteState();
      return;
    }

    if (distanceFromRoute < OFF_ROUTE_ENTER_METRES) {
      return;
    }

    if (offRouteStartedAtRef.current === null) {
      offRouteStartedAtRef.current = now;
      offRouteFixesRef.current = 1;
      return;
    }

    offRouteFixesRef.current += 1;

    const sustainedFor = now - offRouteStartedAtRef.current;
    const cooldownFinished =
      now - lastRerouteAtRef.current >= REROUTE_COOLDOWN_MS;

    if (
      sustainedFor >= OFF_ROUTE_SUSTAINED_MS &&
      offRouteFixesRef.current >= OFF_ROUTE_MIN_FIXES
    ) {
      if (!offRouteActiveRef.current) {
        offRouteActiveRef.current = true;
        onOffRouteChange?.(true);
      }

      if (
        cooldownFinished &&
        !reroutePendingRef.current &&
        !loadingRoute
      ) {
        reroutePendingRef.current = true;
        lastRerouteAtRef.current = now;
        requestRoute({ reason: "off-route" });
      }
    }
  }, [
    clearOffRouteState,
    currentProjection,
    loadingRoute,
    monitoringActive,
    onOffRouteChange,
    requestRoute,
    routeCoordinates.length
  ]);

  useEffect(() => {
    if (monitoringActive) {
      setFollowMode(true);
    } else {
      clearOffRouteState();
    }
  }, [clearOffRouteState, monitoringActive]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  const estimatedRemainingDuration = useMemo(() => {
    if (
      stableRemainingMetres === null ||
      routeInformation.distanceMetres === null ||
      routeInformation.durationSeconds === null ||
      routeInformation.distanceMetres <= 0
    ) {
      return null;
    }

    return Math.max(
      0,
      routeInformation.durationSeconds *
        (stableRemainingMetres / routeInformation.distanceMetres)
    );
  }, [stableRemainingMetres, routeInformation]);

  const journeyArrived =
  stableRemainingMetres !== null &&
  stableRemainingMetres <= 1;

  const formatDistance = (distanceInMetres) => {
    if (distanceInMetres === null) {
      return "Not available";
    }

    if (distanceInMetres < 1000) {
      return `${Math.round(distanceInMetres)} m`;
    }

    const miles = distanceInMetres / METRES_PER_MILE;
    const kilometres = distanceInMetres / 1000;

    return `${miles.toFixed(1)} miles (${kilometres.toFixed(1)} km)`;
  };

  const formatWalkingDuration = (durationInSeconds) => {
    if (durationInSeconds === null) {
      return "Not available";
    }

    const totalMinutes = Math.max(
      1,
      Math.ceil(durationInSeconds / 60)
    );

    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
      return `${hours} hr`;
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
          center={currentPosition || destinationPosition}
          zoom={currentPosition ? 17 : 15}
          scrollWheelZoom={true}
          className="leaflet-map"
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {currentPosition && (
            <Marker position={currentPosition} icon={userIcon}>
              <Popup>
                <strong>Your live location</strong>
                <br />
                Latitude: {currentPosition[0].toFixed(6)}
                <br />
                Longitude: {currentPosition[1].toFixed(6)}
              </Popup>
            </Marker>
          )}

          <Marker
            position={destinationPosition}
            icon={destinationIcon}
          >
            <Popup>
              <strong>Walking destination</strong>
              <br />
              {destination.display_name || "Selected destination"}
            </Popup>
          </Marker>

          {!journeyArrived &&
  visibleRouteCoordinates.length > 1 && (
  <Polyline
              positions={visibleRouteCoordinates}
              pathOptions={{
                color: "#ec4899",
                weight: 7,
                opacity: 0.96,
                lineCap: "round",
                lineJoin: "round"
              }}
            />
          )}

          <MapController
            currentPosition={currentPosition}
            destinationPosition={destinationPosition}
            routeCoordinates={visibleRouteCoordinates}
            monitoringActive={monitoringActive}
            followMode={followMode}
            onFollowModeChange={setFollowMode}
          />
        </MapContainer>

        {currentPosition && (
          <button
            type="button"
            className={`map-follow-button ${
              followMode ? "following" : ""
            }`}
            onClick={() => setFollowMode(true)}
            aria-label="Recenter map on my live location"
            title="Recenter and follow my location"
          >
            <span className="map-follow-icon">⌖</span>
            <span>{followMode ? "Following" : "Recenter"}</span>
          </button>
        )}

        <div className="map-route-status">
          <span
            className={`map-route-status-dot ${
              loadingRoute ? "loading" : ""
            }`}
          />
          <span>
            {loadingRoute
              ? "Updating walking route"
              : "Pedestrian route"}
          </span>
        </div>
      </div>

      {requestingLocation && (
        <div className="route-message">
          <span className="route-loading-dot" />
          Waiting for location permission...
        </div>
      )}

      {loadingRoute && routeCoordinates.length === 0 && (
        <div className="route-message">
          <span className="route-loading-dot" />
          Calculating your pedestrian route...
        </div>
      )}

      {routeError && (
        <div className="route-message route-error">
          {routeError}
        </div>
      )}
      
      {(visibleRouteCoordinates.length > 1 ||
  journeyArrived) && (
  <div className="route-summary">
    <div className="route-summary-card">
      <span>
        {journeyArrived
          ? "✅ Destination"
          : "⏱ Estimated Time Left"}
      </span>

      <strong>
        {journeyArrived
          ? "Arrived"
          : formatWalkingDuration(
              estimatedRemainingDuration
            )}
      </strong>

      <small>
        {journeyArrived
          ? "You have reached your destination."
          : "Based on the pedestrian route returned by NightGuard."}
      </small>
    </div>
  </div>
)}

    </section>
  );
}

export default MonitoringMap;
