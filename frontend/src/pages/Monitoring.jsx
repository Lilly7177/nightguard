import {
  useEffect,
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";
import axios from "axios";

import DestinationSearch from "../components/DestinationSearch";
import MonitoringMap from "../components/MonitoringMap";
import SoundPermission from "../components/SoundPermission";
import API_BASE_URL from "../api";

import "../styles/Monitoring.css";


function Monitoring() {
  const navigate = useNavigate();

  let user = null;

  try {
    const savedUser = localStorage.getItem("user");

    user = savedUser
      ? JSON.parse(savedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to read user information:",
      error
    );
  }


  /* =====================================
     Journey information
  ===================================== */

  const [destination, setDestination] =
    useState(null);

  const [currentLocation, setCurrentLocation] =
    useState(null);

  const [sessionId, setSessionId] =
    useState(null);

  const [showSoundPermission, setShowSoundPermission] =
  useState(false);

const [soundEnabled, setSoundEnabled] =
  useState(false);


  /* =====================================
     Monitoring information
  ===================================== */

  const [status, setStatus] =
    useState("Not Started");

  const [riskScore, setRiskScore] =
    useState(0);

  const [riskLevel, setRiskLevel] =
    useState("Low");


  /* =====================================
     Loading and feedback states
  ===================================== */

  const [starting, setStarting] =
    useState(false);

  const [ending, setEnding] =
    useState(false);

  const [requestingLocation, setRequestingLocation] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("information");


  /*
    Stores the active browser GPS watcher.
  */
  const locationWatchIdRef = useRef(null);


  /* =====================================
     Display a page message
  ===================================== */

  const showMessage = (
    text,
    type = "information"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  // =====================================
// Safety Sound Permission
// =====================================

const allowSound = async () => {
  try {
    const audio = new Audio(
      "/sounds/timer.mp3"
    );

    audio.volume = 0.01;

    await audio.play();

    audio.pause();
    audio.currentTime = 0;

    setSoundEnabled(true);
    setShowSoundPermission(false);

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
      "Unable to enable safety sounds.",
      "error"
    );
  }
};


const continueMuted = async () => {
  setSoundEnabled(false);
  setShowSoundPermission(false);

  showMessage(
    "Continuing without safety alarm sounds.",
    "warning"
  );

  await continueStartMonitoring();
};


  /* =====================================
     Request initial GPS permission
  ===================================== */

  const requestCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            "Location services are not supported by this browser."
          )
        );

        return;
      }

      setRequestingLocation(true);

      showMessage(
        "Please allow NightGuard to access your location.",
        "information"
      );

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude:
              position.coords.latitude,

            longitude:
              position.coords.longitude,

            accuracy:
              position.coords.accuracy,

            speed:
              position.coords.speed,

            heading:
              position.coords.heading,

            timestamp:
              position.timestamp
          };

          setCurrentLocation(locationData);
          setRequestingLocation(false);

          showMessage(
            "Current location detected. Preparing your walking journey...",
            "success"
          );

          resolve(locationData);
        },

        (error) => {
          setRequestingLocation(false);

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
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 60000
        }
      );
    });
  };


  /* =====================================
     Start continuous live GPS tracking
  ===================================== */

  const startLiveLocationTracking = () => {
    if (!navigator.geolocation) {
      return;
    }

    /*
      Prevent more than one GPS watcher.
    */
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        locationWatchIdRef.current
      );
    }

    locationWatchIdRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          const updatedLocation = {
            latitude:
              position.coords.latitude,

            longitude:
              position.coords.longitude,

            accuracy:
              position.coords.accuracy,

            speed:
              position.coords.speed,

            heading:
              position.coords.heading,

            timestamp:
              position.timestamp
          };

          /*
            Ignore extremely inaccurate readings.
          */
          if (
            updatedLocation.accuracy &&
            updatedLocation.accuracy > 100
          ) {
            return;
          }

          setCurrentLocation(updatedLocation);
        },

        (error) => {
          console.error(
            "Live location tracking error:",
            error
          );

          if (
            error.code ===
            error.PERMISSION_DENIED
          ) {
            showMessage(
              "Live location permission has been disabled.",
              "error"
            );
          }
        },

        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 5000
        }
      );
  };


  /* =====================================
     Stop live GPS tracking
  ===================================== */

  const stopLiveLocationTracking = () => {
    if (
      locationWatchIdRef.current !== null
    ) {
      navigator.geolocation.clearWatch(
        locationWatchIdRef.current
      );

      locationWatchIdRef.current = null;
    }
  };


  /*
    Clean up GPS tracking when the user
    leaves the monitoring page.
  */
  useEffect(() => {
    return () => {
      stopLiveLocationTracking();
    };
  }, []);


// =====================================
// Continue Start After Permissions
// =====================================

const continueStartMonitoring = async () => {
  try {
    setStarting(true);

    const detectedLocation =
      await requestCurrentLocation();

    showMessage(
      "Creating your NightGuard monitoring session...",
      "information"
    );

    const response = await axios.post(
      `${API_BASE_URL}/monitoring/start`,
      {
        user_id: user.id,
        destination:
          destination.display_name
      }
    );

    const newSessionId =
      response.data.session.id;

    setSessionId(newSessionId);

    setStatus("Monitoring Active");

    setRiskScore(
      response.data.session.risk_score ?? 10
    );

    setRiskLevel(
      response.data.session.risk_level ?? "Low"
    );

    setCurrentLocation(detectedLocation);

    startLiveLocationTracking();

    showMessage(
      "Night monitoring started successfully.",
      "success"
    );

  } catch (error) {
    console.error(
      "Unable to start monitoring:",
      error
    );

    showMessage(
      error.response?.data?.detail ||
        error.message ||
        "Unable to start monitoring.",
      "error"
    );

  } finally {
    setStarting(false);
    setRequestingLocation(false);
  }
};


// =====================================
// Start Night Monitoring
// =====================================


  const startMonitoring = async () => {
  if (!user?.id) {
    showMessage(
      "Please log in before starting a monitored journey.",
      "error"
    );

    return;
  }

  if (!destination) {
    showMessage(
      "Please search for and select your destination first.",
      "error"
    );

    return;
  }

  // TEMP TEST:
// Always show sound permission first.
setShowSoundPermission(true);
return;

  try {
    setStarting(true);

    const detectedLocation =
      await requestCurrentLocation();

    showMessage(
      "Creating your NightGuard monitoring session...",
      "information"
    );

    const response = await axios.post(
       `${API_BASE_URL}/monitoring/start`,
      {
        user_id: user.id,
        destination:
          destination.display_name
      }
    );

    const newSessionId =
      response.data.session.id;

    setSessionId(newSessionId);

    setStatus("Monitoring Active");

    setRiskScore(
      response.data.session.risk_score ?? 10
    );

    setRiskLevel(
      response.data.session.risk_level ??
        "Low"
    );

    setCurrentLocation(detectedLocation);

    startLiveLocationTracking();

    showMessage(
      "Night monitoring started successfully. Your walking journey is now protected.",
      "success"
    );
  } catch (error) {
    console.error(
      "Unable to start monitoring:",
      error
    );

    showMessage(
      error.response?.data?.detail ||
        error.message ||
        "Unable to start monitoring.",
      "error"
    );
  } finally {
    setStarting(false);
    setRequestingLocation(false);
  }
};

  /* =====================================
     End Night Monitoring
  ===================================== */

  const endMonitoring = async () => {
    if (!sessionId) {
      showMessage(
        "No active monitoring session was found.",
        "error"
      );

      return;
    }

    try {
      setEnding(true);

      showMessage(
        "Ending your monitored journey...",
        "information"
      );

      await axios.post(
         `${API_BASE_URL}/monitoring/end`,
        {
         
          end_reason: "Reached Safely"
        }
      );

      stopLiveLocationTracking();

      setStatus("Journey Completed");
      setSessionId(null);

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
        error.response?.data?.detail ||
          "Unable to end monitoring.",
        "error"
      );
    } finally {
      setEnding(false);
    }
  };


  /* =====================================
     Emergency help
  ===================================== */

  const openEmergencyPage = () => {
    navigate("/emergency", {
      state: {
        sessionId,
        currentLocation,
        destination:
          destination?.display_name
      }
    });
  };


  /* =====================================
     Component output
  ===================================== */

  return (
    <div className="monitoring-page">

      <header className="monitoring-header">

        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          ← Dashboard
        </button>

        <h2>🌙 NightGuard</h2>

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
  destination={destination}
  onDestinationSelect={(selectedPlace) => {
    setDestination(selectedPlace);
    setMessage("");
  }}
/>


        {currentLocation && destination && (
  <MonitoringMap
    destination={destination}
    currentLocation={currentLocation}
    monitoringActive={false}
    requestingLocation={requestingLocation}
  />
)}

        


        {!sessionId ? (
          <button
            type="button"
            className="start-btn"
            onClick={startMonitoring}
            disabled={
              starting ||
              requestingLocation ||
              !destination
            }
          >
            {requestingLocation
              ? "📍 Waiting for Location Permission..."
              : starting
                ? "Starting Night Monitoring..."
                : "▶ Start Night Monitoring"}
          </button>
        ) : (
          <div className="monitoring-active-controls">

            <button
              type="button"
              className="help-btn"
              onClick={openEmergencyPage}
            >
              🚨 Need Help
            </button>

            <button
              type="button"
              className="end-btn"
              onClick={endMonitoring}
              disabled={ending}
            >
              {ending
                ? "Ending Journey..."
                : "✔ Reached Safely"}
            </button>

          </div>
        )}

    {message && (
      <div
        className={
          `monitoring-message ` +
          `monitoring-message-${messageType}`
        }
      >
        {message}
      </div>
    )}

  </main>

  <SoundPermission
    visible={true}
    onAllow={allowSound}
    onMuted={continueMuted}
  />

</div>
);
}

export default Monitoring;