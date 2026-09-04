import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../api";

import DestinationSearch from "../components/DestinationSearch";
import MonitoringMap from "../components/MonitoringMap";
import SoundPermission from "../components/SoundPermission";
import LocationPermission from "../components/LocationPermission";
import "../styles/Monitoring.css";

function MonitoringSetup() {
  const navigate = useNavigate();

  let user = null;

  try {
    const savedUser = localStorage.getItem("user");
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error("Unable to read user information:", error);
  }

  const [destination, setDestination] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  const [starting, setStarting] = useState(false);
  const [requestingLocation, setRequestingLocation] =
    useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("information");

  const [showSoundPermission, setShowSoundPermission] =
  useState(false);

const [soundEnabled, setSoundEnabled] =
  useState(false);

const [showLocationPermission, setShowLocationPermission] =
  useState(false);

  const showMessage = (
    text,
    type = "information"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const allowSound = async () => {
  try {
    const audio = new Audio(
      "/sounds/timer.mp3"
    );

    audio.volume = 0;

    await audio.play();

    audio.pause();
    audio.currentTime = 0;

    // Sound permission accepted
    setSoundEnabled(true);

    // Close sound popup
    setShowSoundPermission(false);

    showMessage(
      "Safety alarm sounds enabled.",
      "success"
    );

    // Now show location permission popup
    setShowLocationPermission(true);

  } catch (error) {
    console.error(
      "Unable to enable sound:",
      error
    );

    showMessage(
      "Unable to enable safety sounds.",
      "error"
    );
  }
};

const continueMuted = () => {
  // Sound disabled
  setSoundEnabled(false);

  // Close sound popup
  setShowSoundPermission(false);

  showMessage(
    "Continuing without safety alarm sounds.",
    "warning"
  );

  // Show location permission popup next
  setShowLocationPermission(true);
};

const allowLocation = async () => {
  try {
    setShowLocationPermission(false);

    const detectedLocation =
      await requestCurrentLocation();

    showMessage(
      "Live location enabled. Starting your journey...",
      "success"
    );

    setStarting(true);

    const response = await axios.post(
      `${API_BASE_URL}/monitoring/start`,
      {
        user_id: user.id,
        destination: destination.display_name
      }
    );

    const session = response.data.session;

    navigate("/live-journey", {
      state: {
        sessionId: session.id,
        destination,
        currentLocation: detectedLocation,
        initialRiskScore:
          session.risk_score ?? 10,
        initialRiskLevel:
          session.risk_level ?? "Low",
        soundEnabled: soundEnabled
      }
    });

  } catch (error) {
    console.error(
      "Unable to enable live location:",
      error
    );

    showMessage(
      error.response?.data?.detail ||
        error.message ||
        "Unable to enable live location.",
      "error"
    );

  } finally {
    setStarting(false);
    setRequestingLocation(false);
  }
};

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
        "Please allow NightGuard to access your live location.",
        "information"
      );

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp
          };

          setCurrentLocation(locationData);
          setRequestingLocation(false);

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
                "Location permission was denied. Please allow location access to begin your monitored journey."
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
            error.code === error.TIMEOUT
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

  const startJourney = async () => {
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

     // Ask about safety audio BEFORE location
  if (!soundEnabled) {
    setShowSoundPermission(true);
    return;
  }

    try {
      setStarting(true);

      const detectedLocation =
        await requestCurrentLocation();

      showMessage(
        "Creating your monitored walking journey...",
        "information"
      );

      const response = await axios.post(
        `${API_BASE_URL}/monitoring/start`,
        {
          user_id: user.id,
          destination: destination.display_name
        }
      );

      const session = response.data.session;

      navigate("/live-journey", {
        state: {
          sessionId: session.id,
          destination,
          currentLocation: detectedLocation,
          initialRiskScore:
            session.risk_score ?? 10,
          initialRiskLevel:
            session.risk_level ?? "Low"
        }
      });
    } catch (error) {
      console.error(
        "Unable to start journey:",
        error
      );

      showMessage(
        error.response?.data?.detail ||
          error.message ||
          "Unable to start your monitored journey.",
        "error"
      );
    } finally {
      setStarting(false);
      setRequestingLocation(false);
    }
  };

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
            🚶 Plan Your Walking Journey
          </h1>

        </section>

        <DestinationSearch
          destination={destination}
          onDestinationSelect={(selectedPlace) => {
            setDestination(selectedPlace);

            if (selectedPlace) {
              showMessage(
                "Destination selected. Press Start Night Monitoring when you are ready.",
                "success"
              );
            } else {
              setMessage("");
            }
          }}
        />

        <MonitoringMap
          destination={destination}
          currentLocation={currentLocation}
          monitoringActive={false}
          requestingLocation={requestingLocation}
        />

        <section className="nightguard-protection">

  <div className="protection-heading">
    <span className="protection-moon">
      🌙
    </span>

    <div>
      <p className="protection-label">
        JOURNEY PROTECTION
      </p>

      <h2>NightGuard Protection</h2>
    </div>
  </div>

  <div className="protection-grid">

    <div className="protection-item">
      <span>🧠</span>

      <div>
        <h3>AI Risk Monitoring</h3>
        <p>
          Analyses movement and journey
          conditions for potential risk.
        </p>
      </div>
    </div>

    <div className="protection-item">
      <span>📍</span>

      <div>
        <h3>Live Journey Tracking</h3>
        <p>
          Tracks your location while your
          monitored journey is active.
        </p>
      </div>
    </div>

    <div className="protection-item">
      <span>🔊</span>

      <div>
        <h3>Safety Checks</h3>
        <p>
          Provides audible warnings when
          a safety check needs attention.
        </p>
      </div>
    </div>

    <div className="protection-item">
      <span>🚨</span>

      <div>
        <h3>Emergency SOS</h3>
        <p>
          Gives you quick access to
          emergency assistance.
        </p>
      </div>
    </div>

  </div>

  <div className="protection-privacy">
    🔒 Your live location is accessed only
    after you give permission.
  </div>

</section>

        <button
          type="button"
          className="start-btn"
          onClick={startJourney}
          disabled={
  starting ||
  requestingLocation
}
        >
          {requestingLocation
            ? "📍 Waiting for Location Permission..."
            : starting
              ? "Starting Night Monitoring..."
              : "▶ Start Night Monitoring"}
        </button>

        {message && messageType === "error" && (
  <div className="validation-popup-overlay">
    <div className="validation-popup">

      <div className="validation-popup-icon">
        ⚠️
      </div>

      <h2>Destination Required</h2>

      <p>{message}</p>

      <button
        type="button"
        onClick={() => setMessage("")}
      >
        OK
      </button>

    </div>
  </div>
)}

{message && messageType !== "error" && (
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
    visible={showSoundPermission}
    onAllow={allowSound}
    onMuted={continueMuted}
  />

  <LocationPermission
  visible={showLocationPermission}
  onAllow={allowLocation}
  onCancel={() => {
    setShowLocationPermission(false);
  }}
/>

    </div>
  );
}

export default MonitoringSetup;