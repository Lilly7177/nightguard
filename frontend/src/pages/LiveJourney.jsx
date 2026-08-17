import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import axios from "axios";

import MonitoringMap from "../components/MonitoringMap";
import JourneyProgress from "../components/JourneyProgress";
import SOSPopup from "../components/SOSPopup";
import AlarmSound from "../components/AlarmSound";

import API_BASE_URL from "../api";

import "../styles/LiveJourney.css";


function calculateDistanceMetres(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const earthRadius = 6371000;

  const toRadians = (value) =>
    (value * Math.PI) / 180;

  const latitudeDifference =
    toRadians(
      latitude2 - latitude1
    );

  const longitudeDifference =
    toRadians(
      longitude2 - longitude1
    );

  const firstLatitude =
    toRadians(latitude1);

  const secondLatitude =
    toRadians(latitude2);

  const a =
    Math.sin(
      latitudeDifference / 2
    ) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(
        longitudeDifference / 2
      ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}


function formatElapsedTime(
  totalSeconds
) {
  const safeSeconds =
    Number.isFinite(totalSeconds)
      ? Math.max(
          0,
          Math.floor(totalSeconds)
        )
      : 0;

  const hours =
    Math.floor(
      safeSeconds / 3600
    );

  const minutes =
    Math.floor(
      (
        safeSeconds % 3600
      ) / 60
    );

  const seconds =
    safeSeconds % 60;

  const paddedMinutes =
    String(minutes).padStart(
      2,
      "0"
    );

  const paddedSeconds =
    String(seconds).padStart(
      2,
      "0"
    );

  if (hours > 0) {
    return (
      `${String(hours).padStart(
        2,
        "0"
      )}:` +
      `${paddedMinutes}:` +
      `${paddedSeconds}`
    );
  }

  return (
    `${paddedMinutes}:` +
    `${paddedSeconds}`
  );
}


function formatSpeed(
  speedMetresPerSecond
) {
  const safeSpeed =
    Number.isFinite(
      speedMetresPerSecond
    )
      ? Math.max(
          0,
          speedMetresPerSecond
        )
      : 0;

  return `${safeSpeed.toFixed(2)} m/s`;
}


/*
 * About 50 metres.
 * 1 mile = approximately 1609 metres.
 */
const ARRIVAL_THRESHOLD_MILES =
  0.031;


/*
 * Backend also protects the first
 * 30 seconds from unreliable startup
 * risk readings.
 */
const WARMUP_SECONDS =
  30;


function LiveJourney() {
  const navigate =
    useNavigate();

  const location =
    useLocation();


  const journeyState =
    location.state || {};


  const {
    sessionId,
    destination,
    currentLocation:
      initialLocation,
    initialRiskScore = 10,
    initialRiskLevel = "Low"
  } = journeyState;


  const [
    currentLocation,
    setCurrentLocation
  ] = useState(
    initialLocation || null
  );


  const [
    riskScore,
    setRiskScore
  ] = useState(
    initialRiskScore
  );


  const [
    riskLevel,
    setRiskLevel
  ] = useState(
    initialRiskLevel
  );


  const [
    riskReason,
    setRiskReason
  ] = useState(
    "Monitoring active"
  );


  const [
    aiRiskLevel,
    setAiRiskLevel
  ] = useState("Low");


  const [
    aiConfidence,
    setAiConfidence
  ] = useState(0);


  const [
    walkingSpeed,
    setWalkingSpeed
  ] = useState(0);


  const [
    offRoute,
    setOffRoute
  ] = useState(false);


  const [
    stationaryDuration,
    setStationaryDuration
  ] = useState(0);


  /*
   * The monitoring session has already
   * been created by MonitoringSetup before
   * this page opens.
   */
  const journeyStarted =
    true;


  const [
    showSOS,
    setShowSOS
  ] = useState(false);


  const [
    elapsedSeconds,
    setElapsedSeconds
  ] = useState(0);


  const [
    journeyStatus,
    setJourneyStatus
  ] = useState(
    "Monitoring Active"
  );


  const [
    message,
    setMessage
  ] = useState(
    "Your live walking journey is being monitored."
  );


  const [
    messageType,
    setMessageType
  ] = useState(
    "success"
  );


  const [
    ending,
    setEnding
  ] = useState(false);


  const [
    sendingLocation,
    setSendingLocation
  ] = useState(false);


  const [
    lastSafetyConfirmation,
    setLastSafetyConfirmation
  ] = useState(0);


  const [
    totalDistance,
    setTotalDistance
  ] = useState(0);


  const [
    remainingDistance,
    setRemainingDistance
  ] = useState(0);


  const warmupActive =
    elapsedSeconds <
    WARMUP_SECONDS;


  const hasReachedDestination =
    journeyStarted &&
    Number.isFinite(
      remainingDistance
    ) &&
    totalDistance > 0 &&
    remainingDistance <=
      ARRIVAL_THRESHOLD_MILES;


  const watchIdRef =
    useRef(null);


  const previousLocationRef =
    useRef(
      initialLocation || null
    );


  const stationaryStartedAtRef =
    useRef(
      Date.now()
    );


  const lastBackendUpdateRef =
    useRef(0);


  const journeyStartedAtRef =
    useRef(
      Date.now()
    );


  const pageActiveRef =
    useRef(true);


  const showMessage = (
    text,
    type = "information"
  ) => {
    setMessage(text);
    setMessageType(type);
  };


  // =========================================
  // VALIDATE JOURNEY STATE
  // =========================================

  useEffect(() => {
    if (
      !sessionId ||
      !destination ||
      !initialLocation
    ) {
      navigate(
        "/monitoring",
        {
          replace: true
        }
      );
    }
  }, [
    sessionId,
    destination,
    initialLocation,
    navigate
  ]);


  // =========================================
  // JOURNEY TIMER
  // =========================================

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          const elapsed =
            Math.floor(
              (
                Date.now() -
                journeyStartedAtRef
                  .current
              ) / 1000
            );

          setElapsedSeconds(
            elapsed
          );
        },
        1000
      );


    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);


  // =========================================
  // SEND LOCATION TO BACKEND
  // =========================================

  const sendLocationToBackend =
    async (
      locationData,
      calculatedSpeed,
      stationarySeconds
    ) => {
      if (!sessionId) {
        return;
      }


      const now =
        Date.now();


      /*
       * Send at most once every 5 seconds.
       */
      if (
        now -
          lastBackendUpdateRef
            .current <
        5000
      ) {
        return;
      }


      lastBackendUpdateRef.current =
        now;


      try {
        setSendingLocation(
          true
        );


        const response =
          await axios.post(
            `${API_BASE_URL}/monitoring/location`,
            {
              session_id:
                Number(sessionId),

              latitude:
                locationData.latitude,

              longitude:
                locationData.longitude,

              speed:
                calculatedSpeed,

              stationary_duration:
                stationarySeconds,

              off_route:
                offRoute
            }
          );


        if (
          !pageActiveRef.current
        ) {
          return;
        }


        const risk =
          response.data.risk ||
          {};


        setRiskScore(
          (previousScore) =>
            risk.risk_score ??
            previousScore
        );


        setRiskLevel(
          (previousLevel) =>
            risk.risk_level ??
            previousLevel
        );


        setRiskReason(
          risk.reason ||
            "Monitoring active"
        );


        const aiPrediction =
          risk.ai_prediction ||
          {};


        setAiRiskLevel(
          aiPrediction.risk_level ||
            "Low"
        );


        setAiConfidence(
          aiPrediction.confidence ??
            0
        );


        /*
         * During backend warm-up,
         * show the calibration message.
         */
        if (
          risk.reason ===
          "Journey startup warm-up active"
        ) {
          showMessage(
            "NightGuard is calibrating your journey GPS and safety monitoring.",
            "information"
          );

          return;
        }


        if (
          risk.risk_level ===
          "Critical"
        ) {
          showMessage(
            "Critical journey risk detected.",
            "error"
          );
        } else if (
          risk.risk_level ===
          "High"
        ) {
          showMessage(
            "High risk detected. NightGuard is monitoring your safety closely.",
            "error"
          );
        } else if (
          risk.risk_level ===
          "Medium"
        ) {
          showMessage(
            "NightGuard has detected increased journey risk.",
            "warning"
          );
        } else {
          showMessage(
            "Your live walking journey is being monitored.",
            "success"
          );
        }

      } catch (error) {
        console.error(
          "Location update failed:",
          error
        );


        if (
          pageActiveRef.current
        ) {
          showMessage(
            error.response
              ?.data
              ?.detail ||
              "Unable to send the latest location update.",
            "error"
          );
        }

      } finally {
        if (
          pageActiveRef.current
        ) {
          setSendingLocation(
            false
          );
        }
      }
    };


  // =========================================
  // REAL GPS MONITORING
  // =========================================

  useEffect(() => {
    if (
      !sessionId ||
      !navigator.geolocation
    ) {
      return;
    }


    pageActiveRef.current =
      true;


    watchIdRef.current =
      navigator.geolocation
        .watchPosition(

          (position) => {
            const newLocation = {
              latitude:
                position.coords
                  .latitude,

              longitude:
                position.coords
                  .longitude,

              accuracy:
                position.coords
                  .accuracy,

              speed:
                position.coords
                  .speed,

              heading:
                position.coords
                  .heading,

              timestamp:
                position.timestamp
            };


            /*
             * Reject extremely inaccurate
             * GPS readings.
             */
            if (
              Number.isFinite(
                newLocation.accuracy
              ) &&
              newLocation.accuracy >
                100
            ) {
              console.log(
                "Ignoring inaccurate GPS reading:",
                newLocation.accuracy
              );

              return;
            }


            const previousLocation =
              previousLocationRef
                .current;


            let calculatedSpeed =
              Number.isFinite(
                newLocation.speed
              )
                ? Math.max(
                    0,
                    newLocation.speed
                  )
                : 0;


            let movementDistance =
              0;


            if (
              previousLocation
            ) {
              movementDistance =
                calculateDistanceMetres(
                  previousLocation
                    .latitude,

                  previousLocation
                    .longitude,

                  newLocation
                    .latitude,

                  newLocation
                    .longitude
                );


              const previousTimestamp =
                previousLocation
                  .timestamp ||
                Date.now();


              const currentTimestamp =
                newLocation
                  .timestamp ||
                Date.now();


              const timeDifferenceSeconds =
                Math.max(
                  1,
                  (
                    currentTimestamp -
                    previousTimestamp
                  ) / 1000
                );


              /*
               * Some browsers do not provide
               * position.coords.speed.
               */
              if (
                !Number.isFinite(
                  newLocation.speed
                )
              ) {
                calculatedSpeed =
                  movementDistance /
                  timeDifferenceSeconds;
              }
            }


            /*
             * Ignore impossible / highly
             * unrealistic walking speed spikes.
             */
            if (
              calculatedSpeed >
              4.5
            ) {
              calculatedSpeed =
                0;
            }


            let stationarySeconds =
              0;


            const locationAccuracy =
              Number.isFinite(
                newLocation.accuracy
              )
                ? newLocation.accuracy
                : 20;


            /*
             * Adaptive movement threshold.
             *
             * Good GPS:
             * around 4 metres.
             *
             * Poorer GPS:
             * threshold increases, up to
             * 12 metres.
             */
            const movementThreshold =
              Math.max(
                4,
                Math.min(
                  12,
                  locationAccuracy *
                    0.35
                )
              );


            /*
             * Walking is accepted if:
             *
             * A) displacement exceeds the
             * adaptive GPS threshold
             *
             * OR
             *
             * B) speed suggests walking AND
             * the device moved at least 2 m.
             */
            const meaningfulMovement =
              (
                movementDistance >=
                  movementThreshold
              ) ||
              (
                calculatedSpeed >=
                  0.5 &&
                movementDistance >=
                  2
              );


            if (
              meaningfulMovement
            ) {
              stationaryStartedAtRef
                .current =
                Date.now();

              stationarySeconds =
                0;
            } else {
              stationarySeconds =
                Math.floor(
                  (
                    Date.now() -
                    stationaryStartedAtRef
                      .current
                  ) / 1000
                );
            }


            previousLocationRef.current =
              newLocation;


            setCurrentLocation(
              newLocation
            );


            setWalkingSpeed(
              calculatedSpeed
            );


            setStationaryDuration(
              stationarySeconds
            );


            /*
             * Safety check after 2 minutes
             * stationary.
             */
            const cooldownFinished =
              Date.now() -
                lastSafetyConfirmation >
              5 * 60 * 1000;


            if (
              !warmupActive &&
              stationarySeconds >=
                120 &&
              !showSOS &&
              cooldownFinished
            ) {
              setShowSOS(
                true
              );

              setRiskScore(
                75
              );

              setRiskLevel(
                "High"
              );

              setRiskReason(
                "User stationary for more than 2 minutes"
              );

              showMessage(
                "You have been stationary for more than 2 minutes. Please confirm that you are safe.",
                "warning"
              );
            }


            sendLocationToBackend(
              newLocation,
              calculatedSpeed,
              stationarySeconds
            );
          },


          (error) => {
            console.error(
              "Live GPS error:",
              error
            );


            if (
              error.code ===
              error.PERMISSION_DENIED
            ) {
              showMessage(
                "Location permission was disabled. Live journey monitoring cannot continue.",
                "error"
              );

              setJourneyStatus(
                "Location Disabled"
              );
            } else if (
              error.code ===
              error.POSITION_UNAVAILABLE
            ) {
              showMessage(
                "Your current GPS position is temporarily unavailable.",
                "warning"
              );
            } else if (
              error.code ===
              error.TIMEOUT
            ) {
              showMessage(
                "The GPS update timed out. NightGuard will continue trying.",
                "warning"
              );
            }
          },


          {
            enableHighAccuracy:
              true,

            timeout:
              20000,

            maximumAge:
              3000
          }

        );


    return () => {
      pageActiveRef.current =
        false;


      if (
        watchIdRef.current !==
        null
      ) {
        navigator.geolocation
          .clearWatch(
            watchIdRef.current
          );

        watchIdRef.current =
          null;
      }
    };

  }, [
    sessionId,
    offRoute,
    showSOS,
    lastSafetyConfirmation,
    warmupActive
  ]);


  // =========================================
  // DESTINATION ARRIVAL
  // =========================================

  useEffect(() => {
    if (
      !hasReachedDestination
    ) {
      return;
    }


    showMessage(
      "You are within about 50 metres of your destination. Confirm when you have arrived safely.",
      "success"
    );

  }, [
    hasReachedDestination
  ]);


  // =========================================
  // END JOURNEY
  // =========================================

  const endJourney =
    async () => {
      if (!sessionId) {
        showMessage(
          "Session ID is missing. The journey cannot be ended.",
          "error"
        );

        return;
      }


      try {
        setEnding(
          true
        );


        showMessage(
          "Ending your monitored journey...",
          "information"
        );


        await axios.post(
          `${API_BASE_URL}/monitoring/end`,
          {
            session_id:
              Number(sessionId),

            end_reason:
              "Reached Safely"
          }
        );


        if (
          watchIdRef.current !==
          null
        ) {
          navigator.geolocation
            .clearWatch(
              watchIdRef.current
            );

          watchIdRef.current =
            null;
        }


        pageActiveRef.current =
          false;


        setShowSOS(
          false
        );


        setJourneyStatus(
          "Journey Completed"
        );


        showMessage(
          "Journey completed successfully. You reached safely.",
          "success"
        );


        window.setTimeout(
          () => {
            navigate(
              "/dashboard",
              {
                replace: true
              }
            );
          },
          1200
        );

      } catch (error) {
        console.error(
          "Unable to end journey:",
          error.response?.data ||
            error
        );


        showMessage(
          error.response
            ?.data
            ?.detail ||
            "Unable to end the monitored journey.",
          "error"
        );

      } finally {
        setEnding(
          false
        );
      }
    };


  // =========================================
  // CANCEL JOURNEY
  // =========================================

  const cancelJourney =
    async () => {
      if (!sessionId) {
        showMessage(
          "Session ID is missing. The journey cannot be cancelled.",
          "error"
        );

        return;
      }


      const confirmed =
        window.confirm(
          "Are you sure you want to cancel this journey?"
        );


      if (!confirmed) {
        return;
      }


      try {
        setEnding(
          true
        );


        showMessage(
          "Cancelling your monitored journey...",
          "information"
        );


        await axios.post(
          `${API_BASE_URL}/monitoring/end`,
          {
            session_id:
              Number(sessionId),

            end_reason:
              "Cancelled by User"
          }
        );


        if (
          watchIdRef.current !==
          null
        ) {
          navigator.geolocation
            .clearWatch(
              watchIdRef.current
            );

          watchIdRef.current =
            null;
        }


        pageActiveRef.current =
          false;


        setShowSOS(
          false
        );


        setJourneyStatus(
          "Journey Cancelled"
        );


        showMessage(
          "Journey cancelled successfully.",
          "success"
        );


        window.setTimeout(
          () => {
            navigate(
              "/dashboard",
              {
                replace: true
              }
            );
          },
          1200
        );

      } catch (error) {
        console.error(
          "Unable to cancel journey:",
          error.response?.data ||
            error
        );


        showMessage(
          error.response
            ?.data
            ?.detail ||
            "Unable to cancel the journey.",
          "error"
        );

      } finally {
        setEnding(
          false
        );
      }
    };


  // =========================================
  // MANUAL EMERGENCY
  // =========================================

  const openEmergency =
    () => {
      setShowSOS(
        false
      );


      setRiskScore(
        100
      );

      setRiskLevel(
        "Critical"
      );

      setRiskReason(
        "Emergency assistance requested"
      );


      navigate(
        "/emergency",
        {
          state: {
            sessionId,

            destination:
              destination
                ?.display_name,

            currentLocation,

            riskScore:
              100,

            riskLevel:
              "Critical",

            automaticEmergency:
              false
          }
        }
      );
    };


  // =========================================
  // AUTOMATIC EMERGENCY
  // =========================================

  const triggerAutomaticEmergency =
    () => {
      setShowSOS(
        false
      );


      setRiskScore(
        100
      );

      setRiskLevel(
        "Critical"
      );

      setRiskReason(
        "No response received during safety check"
      );


      showMessage(
        "No safety response received. Emergency assistance is being activated.",
        "error"
      );


      navigate(
        "/emergency",
        {
          state: {
            sessionId,

            destination:
              destination
                ?.display_name,

            currentLocation,

            riskScore:
              100,

            riskLevel:
              "Critical",

            automaticEmergency:
              true
          }
        }
      );
    };


  // =========================================
  // USER CONFIRMS SAFE
  // =========================================

  const confirmSafe =
    () => {
      setShowSOS(
        false
      );


      setLastSafetyConfirmation(
        Date.now()
      );


      stationaryStartedAtRef
        .current =
        Date.now();


      setStationaryDuration(
        0
      );


      setRiskScore(
        10
      );


      setRiskLevel(
        "Low"
      );


      setRiskReason(
        "Monitoring active"
      );


      showMessage(
        "Safety confirmed. NightGuard will continue monitoring.",
        "success"
      );
    };


  if (
    !sessionId ||
    !destination ||
    !currentLocation
  ) {
    return null;
  }  
  
  return (
    <div className="live-journey-page">


      {/* =====================================
          HEADER
      ===================================== */}

      <header className="live-journey-header">

        <button
          type="button"
          className="live-journey-back-btn"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          ← Dashboard
        </button>


        <div className="live-journey-brand">
          🌙 NightGuard
        </div>


        <div className="journey-live-badge">
          <span></span>
          LIVE
        </div>

      </header>



      <main className="live-journey-content">


        {/* =================================
            INTRO
        ================================= */}

        <section className="live-journey-intro">

          <p className="live-journey-label">
            ACTIVE WALKING JOURNEY
          </p>


          <h1>
            🚶 Journey Monitoring
          </h1>


          <p>
            NightGuard is monitoring your
            live location and walking
            behaviour until you reach your
            destination.
          </p>

        </section>



        {/* =================================
            JOURNEY OVERVIEW
        ================================= */}

        <section className="journey-overview-card">

          <div>
            <span>
              Journey Status
            </span>

            <strong>
              {journeyStatus}
            </strong>
          </div>


          <div>
            <span>
              Journey Duration
            </span>

            <strong>
              {
                formatElapsedTime(
                  elapsedSeconds
                )
              }
            </strong>
          </div>


          <div>
            <span>
              GPS Connection
            </span>

            <strong className="gps-active-text">
              {
                sendingLocation
                  ? "Updating..."
                  : "Connected"
              }
            </strong>
          </div>

        </section>



        {/* =================================
            DESTINATION
        ================================= */}

        <section className="journey-destination-card">

          <span>
            🏁 Destination
          </span>

          <p>
            {
              destination
                .display_name
            }
          </p>

        </section>



        {/* =================================
            MAP
        ================================= */}

        <MonitoringMap
          destination={
            destination
          }

          currentLocation={
            currentLocation
          }

          monitoringActive={
            true
          }

          requestingLocation={
            false
          }

          onTotalDistanceChange={
            setTotalDistance
          }

          onRemainingDistanceChange={
            setRemainingDistance
          }

          onOffRouteChange={
            setOffRoute
          }
        />



        {/* =================================
            JOURNEY PROGRESS
        ================================= */}

        <JourneyProgress
          totalDistance={
            totalDistance
          }

          remainingDistance={
            remainingDistance
          }
        />



        {/* =================================
            LIVE STATS
        ================================= */}

        <section className="journey-live-stats">


          <div className="journey-stat-card">

            <span>
              🚶 Walking Speed
            </span>

            <strong>
              {
                formatSpeed(
                  walkingSpeed
                )
              }
            </strong>

            <small>
              Current estimated speed
            </small>

          </div>



          <div className="journey-stat-card">

            <span>
              ⏸ Stationary Time
            </span>

            <strong>
              {
                formatElapsedTime(
                  stationaryDuration
                )
              }
            </strong>

            <small>
              Time without meaningful
              movement
            </small>

          </div>



          <div
            className={
              `journey-stat-card ` +
              `ai-safety-card ` +
              `risk-card-${riskLevel.toLowerCase()}`
            }
          >

            <span>
              🤖 AI Safety Assessment
            </span>


            {warmupActive && (
              <small>
                🛰️ GPS calibration in progress —{" "}
                {
                  Math.max(
                    0,
                    WARMUP_SECONDS -
                      elapsedSeconds
                  )
                }
                s
              </small>
            )}


            <strong>
              {riskLevel}
            </strong>


            <div className="ai-safety-details">

              <span>
                Risk Score:{" "}
                <b>
                  {riskScore}
                </b>
              </span>


              <span>
                Confidence:{" "}
                <b>
                  {
                    Number(
                      aiConfidence
                    ).toFixed(1)
                  }
                  %
                </b>
              </span>

            </div>


            <small>
              {riskReason}
            </small>


            {!warmupActive &&
              aiRiskLevel && (
                <small>
                  ML Prediction:{" "}
                  {aiRiskLevel}
                </small>
              )}

          </div>

        </section>



        {/* =================================
            ARRIVAL INFORMATION
        ================================= */}

        {hasReachedDestination && (
          <section className="journey-arrival-message">

            <span>
              ✅
            </span>

            <div>
              <strong>
                Destination Reached
              </strong>

              <p>
                You are within about
                50 metres of your
                destination. Confirm that
                you arrived safely.
              </p>
            </div>

          </section>
        )}



        {/* =================================
            JOURNEY ACTIONS
        ================================= */}

        <div className="journey-action-section">


          <div className="journey-action-row">


            <button
              type="button"

              className={
                `journey-complete-btn ${
                  hasReachedDestination
                    ? "journey-reached-btn"
                    : ""
                }`
              }

              onClick={() => {
                const confirmed =
                  window.confirm(
                    hasReachedDestination
                      ? "You are within about 50 metres of your destination. Confirm that you arrived safely?"
                      : "Do you want to end this monitored journey?"
                  );


                if (
                  confirmed
                ) {
                  endJourney();
                }
              }}

              disabled={
                ending
              }
            >

              {
                ending
                  ? "Ending Journey..."
                  : hasReachedDestination
                    ? "✅ Reached Safely"
                    : "🏁 End Journey"
              }

            </button>



            <button
              type="button"
              className="journey-cancel-btn"
              onClick={
                cancelJourney
              }
              disabled={
                ending
              }
            >
              ❌ Cancel Journey
            </button>

          </div>



          {/* =================================
              EMERGENCY
          ================================= */}

          <button
            type="button"
            className="journey-help-btn journey-help-large"
            onClick={
              openEmergency
            }
            disabled={
              ending
            }
          >

            <span className="journey-help-icon">
              🚨
            </span>


            <span className="journey-help-text">

              <strong>
                Need Help
              </strong>

              <small>
                Emergency / Safety
                Assistance
              </small>

            </span>

          </button>


        </div>



        {/* =================================
            STATUS MESSAGE
        ================================= */}

        {message && (
          <div
            className={
              `live-journey-message ` +
              `live-journey-message-${messageType}`
            }
          >
            {message}
          </div>
        )}


      </main>



      {/* =====================================
          WARNING SOUND
      ===================================== */}

      <AlarmSound
        active={
          showSOS
        }

        mode="warning"
      />



      {/* =====================================
          SAFETY POPUP
      ===================================== */}

      <SOSPopup
        visible={
          showSOS
        }

        onSafe={
          confirmSafe
        }

        onEmergency={
          triggerAutomaticEmergency
        }
      />


    </div>
  );
}


export default LiveJourney;