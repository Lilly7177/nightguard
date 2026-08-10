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
import API_BASE_URL from "../api";

import "../styles/Emergency.css";
import AlarmSound from "../components/AlarmSound";



function Emergency() {
  const navigate = useNavigate();
  const routeLocation = useLocation();

  let user = null;

  try {
    const savedUser =
      localStorage.getItem("user");

    user = savedUser
      ? JSON.parse(savedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to read user information:",
      error
    );
  }


  const emergencyState =
    routeLocation.state || {};

  const {
    sessionId = null,
    destination = "",
    currentLocation = null,
    riskScore = 100,
    riskLevel = "Critical",
    automaticEmergency = false
  } = emergencyState;


  const automaticAlertSentRef =
    useRef(false);


  const initialLocation =
    currentLocation?.latitude &&
    currentLocation?.longitude
      ? `${currentLocation.latitude}, ${currentLocation.longitude}`
      : "";


  const initialMessage =
    automaticEmergency
      ? "Automatic NightGuard emergency alert. The user did not respond to the safety check and may require immediate assistance."
      : "I need immediate emergency assistance.";


  const [location, setLocation] =
    useState(initialLocation);

  const [message, setMessage] =
    useState(initialMessage);

  const [status, setStatus] =
    useState("");

  const [
    loadingLocation,
    setLoadingLocation
  ] = useState(false);

  const [sending, setSending] =
    useState(false);

  const [alertSent, setAlertSent] =
    useState(false);

  
  const [emergencyStage, setEmergencyStage] =
  useState(
    automaticEmergency
      ? "Emergency activated"
      : ""
  );

const [sirenActive, setSirenActive] =
  useState(automaticEmergency);


  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus(
        "Location services are not supported by this browser."
      );

      return;
    }

    setLoadingLocation(true);

    setStatus(
      "Detecting your location..."
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        const locationText =
          `${latitude}, ${longitude}`;

        setLocation(locationText);

        setStatus(
          "Location detected successfully."
        );

        setLoadingLocation(false);
      },

      (error) => {
        console.error(
          "Location detection failed:",
          error
        );

        setStatus(
          "Unable to detect location. Please allow location permission."
        );

        setLoadingLocation(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000
      }
    );
  };


  const sendEmergencyAlert = async (
    locationOverride = null,
    messageOverride = null
  ) => {
    if (!user?.id) {
      setStatus(
        "Please login before sending an emergency alert."
      );

      return;
    }

    const alertLocation =
      locationOverride || location;

    const alertMessage =
      messageOverride || message;

    if (!alertLocation?.trim()) {
      setStatus(
        "Please detect or enter your location first."
      );

      return;
    }

    if (sending || alertSent) {
      return;
    }

    try {
      setSending(true);

      setEmergencyStage(
  "Contacting trusted contacts..."
);

window.setTimeout(() => {
  setEmergencyStage(
    "Sending live location..."
  );
}, 2000);

window.setTimeout(() => {
  setEmergencyStage(
    "Sending emergency alert..."
  );
}, 4000);

      setStatus(
        automaticEmergency
          ? "Automatically sending emergency alert..."
          : "Sending emergency alert..."
      );

      const response = await axios.post(
        `${API_BASE_URL}/alerts`,
        {
          user_id: user.id,
          alert_type:
            automaticEmergency
              ? "AUTOMATIC_SOS"
              : "SOS",
          location: alertLocation,
          message: alertMessage
        }
      );

      setAlertSent(true);

      setEmergencyStage(
  "Emergency alert sent successfully"
);

window.setTimeout(() => {
  setSirenActive(false);
}, 10000);

      setStatus(
        `${response.data.message}. Alert ID: ${response.data.alert_id}`
      );
    } catch (error) {
      console.error(
        "Emergency alert failed:",
        error
      );

      setStatus(
        error.response?.data?.detail ||
          "Emergency alert could not be sent."
      );
    } finally {
      setSending(false);
    }
  };


  useEffect(() => {
    if (
      !automaticEmergency ||
      automaticAlertSentRef.current
    ) {
      return;
    }

    automaticAlertSentRef.current = true;

    const automaticMessage = [
      "Automatic NightGuard emergency alert.",
      "The user did not respond to the safety check.",
      destination
        ? `Destination: ${destination}.`
        : "",
      sessionId
        ? `Monitoring session: ${sessionId}.`
        : "",
      `Risk level: ${riskLevel}.`,
      `Risk score: ${riskScore}.`,
      "Immediate assistance may be required."
    ]
      .filter(Boolean)
      .join(" ");

    setMessage(automaticMessage);

    if (initialLocation) {
      sendEmergencyAlert(
        initialLocation,
        automaticMessage
      );

      return;
    }

    if (!navigator.geolocation) {
      setStatus(
        "Automatic alert could not detect the current location."
      );

      return;
    }

    setLoadingLocation(true);

    setStatus(
      "Detecting location for automatic emergency alert..."
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detectedLocation =
          `${position.coords.latitude}, ${position.coords.longitude}`;

        setLocation(detectedLocation);

        setLoadingLocation(false);

        sendEmergencyAlert(
          detectedLocation,
          automaticMessage
        );
      },

      (error) => {
        console.error(
          "Automatic location detection failed:",
          error
        );

        setLoadingLocation(false);

        setStatus(
          "Automatic emergency alert needs location access. Please detect your location and press Send Emergency Alert."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000
      }
    );
  }, []);


  return (
    <div className="emergency-page">

      <AlarmSound
  active={sirenActive}
  mode="emergency"
/>

      <header className="emergency-header">

        <button
          type="button"
          className="emergency-back-btn"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          ← Back to Dashboard
        </button>

    

        <div className="emergency-logo">
          🌙 NightGuard
        </div>

      </header>


      <main className="emergency-content">

        <section className="emergency-intro">

          <p className="emergency-label">
            EMERGENCY RESPONSE
          </p>

          <h1>
            🚨 Emergency SOS
          </h1>

          <p>
            {automaticEmergency
              ? "NightGuard detected no response during the safety check. An automatic emergency alert is being processed."
              : "Use this page only when you need immediate assistance. Your location and emergency message will be recorded securely."}
          </p>

        </section>


        {automaticEmergency && (
  <section className="emergency-status">

    <strong>
      🚨 Emergency Activated
    </strong>

    <p>
      🔊 Loud emergency siren active
    </p>

    <p>
      {emergencyStage}
    </p>

    <p>
      Risk: {riskLevel} ({riskScore})
    </p>

  </section>
)}

        <section className="emergency-layout">

          <div className="sos-panel">

            <div className="sos-ring">

              <button
                type="button"
                className="sos-button"
                onClick={() =>
                  sendEmergencyAlert()
                }
                disabled={
                  sending ||
                  alertSent
                }
              >
                {sending
                  ? "SENDING..."
                  : alertSent
                    ? "SENT"
                    : "SOS"}
              </button>

            </div>

            <h2>
              {alertSent
                ? "Emergency alert sent successfully"
                : automaticEmergency
                  ? "Automatic emergency alert"
                  : "Press SOS to create an emergency alert"}
            </h2>

            <p>
              Your emergency alert will be saved
              with your current location.
            </p>

          </div>


          <div className="emergency-form-card">

            <h2>
              Emergency Details
            </h2>

            <label htmlFor="emergency-location">
              Current Location
            </label>

            <div className="location-input-row">

              <input
                id="emergency-location"
                type="text"
                placeholder="Latitude, Longitude or location"
                value={location}
                onChange={(event) =>
                  setLocation(
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                className="location-btn"
                onClick={getCurrentLocation}
                disabled={
                  loadingLocation ||
                  sending
                }
              >
                {loadingLocation
                  ? "Detecting..."
                  : "📍 Detect"}
              </button>

            </div>


            <label htmlFor="emergency-message">
              Emergency Message
            </label>

            <textarea
              id="emergency-message"
              rows="5"
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
            />


            <button
              type="button"
              className="send-alert-btn"
              onClick={() =>
                sendEmergencyAlert()
              }
              disabled={
                sending ||
                alertSent
              }
            >
              {sending
                ? "Sending Emergency Alert..."
                : alertSent
                  ? "Emergency Alert Sent"
                  : "Send Emergency Alert"}
            </button>


            {status && (
              <div className="emergency-status">
                {status}
              </div>
            )}

          </div>

        </section>

      </main>

    </div>
  );
}

export default Emergency;