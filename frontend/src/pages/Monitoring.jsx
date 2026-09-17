import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import axios from "axios";

import DestinationSearch
  from "../components/DestinationSearch";

import MonitoringMap
  from "../components/MonitoringMap";

import SoundPermission
  from "../components/SoundPermission";

import API_BASE_URL
  from "../api";

import "../styles/Monitoring.css";


function Monitoring() {

  const navigate =
    useNavigate();


  let user = null;


  try {

    const savedUser =
      localStorage.getItem(
        "user"
      );


    user =
      savedUser
        ? JSON.parse(
            savedUser
          )
        : null;


  } catch (error) {

    console.error(
      "Unable to read user information:",
      error
    );
  }


  // =====================================
  // JOURNEY INFORMATION
  // =====================================

  const [
    destination,
    setDestination
  ] =
    useState(null);


  const [
    currentLocation,
    setCurrentLocation
  ] =
    useState(null);


  const [
    sessionId,
    setSessionId
  ] =
    useState(null);


  const [
    showSoundPermission,
    setShowSoundPermission
  ] =
    useState(false);


  const [
    soundEnabled,
    setSoundEnabled
  ] =
    useState(false);


  // =====================================
  // MONITORING INFORMATION
  // =====================================

  const [
    status,
    setStatus
  ] =
    useState(
      "Not Started"
    );


  const [
    riskScore,
    setRiskScore
  ] =
    useState(0);


  const [
    riskLevel,
    setRiskLevel
  ] =
    useState("Low");


  // =====================================
  // LOADING / FEEDBACK
  // =====================================

  const [
    starting,
    setStarting
  ] =
    useState(false);


  const [
    ending,
    setEnding
  ] =
    useState(false);


  const [
    requestingLocation,
    setRequestingLocation
  ] =
    useState(false);


  const [
    message,
    setMessage
  ] =
    useState("");


  const [
    messageType,
    setMessageType
  ] =
    useState(
      "information"
    );


  /*
   * Retained for safe cleanup if
   * a GPS watcher is ever active.
   */
  const locationWatchIdRef =
    useRef(null);


  // =====================================
  // PAGE MESSAGE
  // =====================================

  const showMessage = (
    text,
    type = "information"
  ) => {

    setMessage(
      text
    );

    setMessageType(
      type
    );
  };


  // =====================================
  // SOUND PERMISSION
  // =====================================

  const allowSound =
    async () => {

      try {

        const audio =
          new Audio(
            "/sounds/timer.mp3"
          );


        audio.volume =
          0.01;


        await audio.play();


        audio.pause();

        audio.currentTime =
          0;


        setSoundEnabled(
          true
        );


        setShowSoundPermission(
          false
        );


        showMessage(
          "Safety alarm sounds enabled.",
          "success"
        );


        await continueStartMonitoring();


      } catch (error) {

        console.error(
          "Unable to enable safety sound:",
          error
        );


        showMessage(
          "Unable to enable safety sounds. You can continue without sound.",
          "error"
        );
      }
    };


  const continueMuted =
    async () => {

      setSoundEnabled(
        false
      );


      setShowSoundPermission(
        false
      );


      showMessage(
        "Continuing without safety alarm sounds.",
        "warning"
      );


      await continueStartMonitoring();
    };


  // =====================================
  // REQUEST INITIAL GPS LOCATION
  // =====================================

  const requestCurrentLocation =
    () => {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          if (
            !navigator.geolocation
          ) {

            reject(
              new Error(
                "Location services are not supported by this browser."
              )
            );

            return;
          }


          setRequestingLocation(
            true
          );


          showMessage(
            "Please allow NightGuard to access your location.",
            "information"
          );


          navigator.geolocation
            .getCurrentPosition(

              (position) => {

                const locationData = {

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


                setCurrentLocation(
                  locationData
                );


                setRequestingLocation(
                  false
                );


                showMessage(
                  "Current location detected. Preparing your walking journey...",
                  "success"
                );


                resolve(
                  locationData
                );
              },


              (error) => {

                setRequestingLocation(
                  false
                );


                if (
                  error.code ===
                  error.PERMISSION_DENIED
                ) {

                  reject(
                    new Error(
                      "Location permission was denied. Please allow location access to start monitoring."
                    )
                  );


                } else if (
                  error.code ===
                  error.POSITION_UNAVAILABLE
                ) {

                  reject(
                    new Error(
                      "Your current location is unavailable. Please check your device location settings."
                    )
                  );


                } else if (
                  error.code ===
                  error.TIMEOUT
                ) {

                  reject(
                    new Error(
                      "Location detection timed out. Please try again."
                    )
                  );


                } else {

                  reject(
                    new Error(
                      "Unable to detect your current location."
                    )
                  );
                }
              },


              {
                enableHighAccuracy:
                  true,

                timeout:
                  20000,

                maximumAge:
                  10000
              }

            );
        }
      );
    };


  // =====================================
  // OPTIONAL GPS WATCHER CLEANUP
  // =====================================

  const stopLiveLocationTracking =
    () => {

      if (
        locationWatchIdRef.current !==
        null
      ) {

        navigator.geolocation
          .clearWatch(
            locationWatchIdRef.current
          );


        locationWatchIdRef.current =
          null;
      }
    };


  useEffect(() => {

    return () => {

      stopLiveLocationTracking();
    };

  }, []);


  // =====================================
  // CONTINUE START AFTER SOUND PERMISSION
  // =====================================

  const continueStartMonitoring =
    async () => {

      if (
        starting ||
        requestingLocation
      ) {
        return;
      }


      if (
        !user?.id
      ) {

        showMessage(
          "Please log in before starting a monitored journey.",
          "error"
        );

        return;
      }


      if (
        !destination
      ) {

        showMessage(
          "Please select your destination first.",
          "error"
        );

        return;
      }


      try {

        setStarting(
          true
        );


        const detectedLocation =
          await requestCurrentLocation();


        showMessage(
          "Creating your NightGuard monitoring session...",
          "information"
        );


        const response =
          await axios.post(

            `${API_BASE_URL}/monitoring/start`,

            {
              user_id:
                user.id,

              destination:
                destination.display_name
            },

            {
              /*
               * Allows enough time for a
               * sleeping backend service
               * to wake and respond.
               */
              timeout:
                45000
            }

          );


        const newSessionId =
          response.data
            ?.session
            ?.id;


        if (
          !newSessionId
        ) {

          throw new Error(
            "Monitoring session could not be created."
          );
        }


        const initialRiskScore =
          response.data
            .session
            .risk_score ??
          10;


        const initialRiskLevel =
          response.data
            .session
            .risk_level ??
          "Low";


        setSessionId(
          newSessionId
        );


        setCurrentLocation(
          detectedLocation
        );


        setStatus(
          "Monitoring Active"
        );


        setRiskScore(
          initialRiskScore
        );


        setRiskLevel(
          initialRiskLevel
        );


        showMessage(
          "Night monitoring started successfully.",
          "success"
        );


        /*
         * LiveJourney starts its own
         * continuous GPS watcher.
         *
         * Do not keep another watcher
         * running on this page.
         */
        stopLiveLocationTracking();


        navigate(
          "/live-journey",
          {
            state: {

              sessionId:
                newSessionId,

              destination,

              currentLocation:
                detectedLocation,

              initialRiskScore,

              initialRiskLevel,

              soundEnabled
            },

            replace:
              true
          }
        );


      } catch (error) {

        console.error(
          "Unable to start monitoring:",
          error
        );


        if (
          error.code ===
          "ECONNABORTED"
        ) {

          showMessage(
            "The NightGuard server is taking longer than expected to respond. Please try again.",
            "error"
          );


        } else {

          showMessage(
            error.response
              ?.data
              ?.detail ||
              error.message ||
              "Unable to start monitoring. Please try again.",
            "error"
          );
        }


      } finally {

        setStarting(
          false
        );


        setRequestingLocation(
          false
        );
      }
    };


  // =====================================
  // START NIGHT MONITORING
  // =====================================

  const startMonitoring =
    async () => {

      if (
        !user?.id
      ) {

        showMessage(
          "Please log in before starting a monitored journey.",
          "error"
        );

        return;
      }


      if (
        !destination
      ) {

        showMessage(
          "Please search for and select your destination first.",
          "error"
        );

        return;
      }


      /*
       * Prevent repeated clicks while
       * a start operation is active.
       */
      if (
        starting ||
        requestingLocation
      ) {
        return;
      }


      /*
       * Ask about alarm sound first.
       *
       * Either button in the permission
       * popup continues the journey start.
       */
      setShowSoundPermission(
        true
      );
    };


  // =====================================
  // END MONITORING
  // =====================================

  const endMonitoring =
    async () => {

      if (
        !sessionId
      ) {

        showMessage(
          "No active monitoring session was found.",
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
              Number(
                sessionId
              ),

            end_reason:
              "Reached Safely"
          }
        );


        stopLiveLocationTracking();


        setStatus(
          "Journey Completed"
        );


        setSessionId(
          null
        );


        showMessage(
          "Journey completed. You reached your destination safely.",
          "success"
        );


      } catch (error) {

        console.error(
          "Unable to end monitoring:",
          error
        );


        showMessage(
          error.response
            ?.data
            ?.detail ||
            "Unable to end monitoring.",
          "error"
        );


      } finally {

        setEnding(
          false
        );
      }
    };


  // =====================================
  // EMERGENCY HELP
  // =====================================

  const openEmergencyPage =
    () => {

      navigate(
        "/emergency",
        {
          state: {

            sessionId,

            currentLocation,

            destination:
              destination
                ?.display_name
          }
        }
      );
    };


  // =====================================
  // COMPONENT OUTPUT
  // =====================================

  return (

    <div className="monitoring-page">


      <header className="monitoring-header">

        <button
          type="button"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          ← Dashboard
        </button>


        <h2>
          🌙 NightGuard
        </h2>

      </header>


      <main className="monitoring-content">


        <section className="monitoring-intro">

          <h1>
            🌙 Start Live Tracking
          </h1>

          <p>
            Enter your destination to begin.
          </p>

        </section>


        <DestinationSearch
          destination={
            destination
          }

          onDestinationSelect={
            (selectedPlace) => {

              setDestination(
                selectedPlace
              );

              setMessage(
                ""
              );
            }
          }
        />


        {
          currentLocation &&
          destination && (

            <MonitoringMap
              destination={
                destination
              }

              currentLocation={
                currentLocation
              }

              monitoringActive={
                false
              }

              requestingLocation={
                requestingLocation
              }
            />

          )
        }


        {
          !sessionId
            ? (

              <button
                type="button"

                className="start-btn"

                onClick={
                  startMonitoring
                }

                disabled={
                  starting ||
                  requestingLocation ||
                  !destination
                }
              >

                {
                  requestingLocation

                    ? "📍 Waiting for Location Permission..."

                    : starting

                      ? "Starting Night Monitoring..."

                      : "▶ Start Night Monitoring"
                }

              </button>

            )

            : (

              <div className="monitoring-active-controls">


                <button
                  type="button"

                  className="help-btn"

                  onClick={
                    openEmergencyPage
                  }
                >
                  🚨 Need Help
                </button>


                <button
                  type="button"

                  className="end-btn"

                  onClick={
                    endMonitoring
                  }

                  disabled={
                    ending
                  }
                >

                  {
                    ending
                      ? "Ending Journey..."
                      : "✔ Reached Safely"
                  }

                </button>

              </div>
            )
        }


        {
          message && (

            <div
              className={
                `monitoring-message ` +
                `monitoring-message-${messageType}`
              }
            >
              {message}
            </div>

          )
        }


      </main>


      <SoundPermission
        visible={
          showSoundPermission
        }

        onAllow={
          allowSound
        }

        onMuted={
          continueMuted
        }
      />


    </div>
  );
}


export default Monitoring;