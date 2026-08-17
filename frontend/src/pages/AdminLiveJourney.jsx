import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import axios from "axios";

import API_BASE_URL from "../api";
import "../styles/AdminLiveJourney.css";


function AdminLiveJourney() {

  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [journey, setJourney] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =====================================
  // LOAD JOURNEY
  // =====================================

  const loadJourney = useCallback(
    async () => {

      try {

        setError("");

        const response =
          await axios.get(
            `${API_BASE_URL}/admin/live-monitoring/${sessionId}`
          );

        setJourney(response.data);

      } catch (error) {

        console.error(
          "Load live journey error:",
          error
        );

        setError(
          error.response?.data?.detail ||
          "Unable to load this user's journey."
        );

      } finally {

        setLoading(false);

      }

    },
    [sessionId]
  );


  // =====================================
  // AUTO REFRESH
  // =====================================

  useEffect(() => {

    loadJourney();

    const interval =
      window.setInterval(
        loadJourney,
        5000
      );

    return () => {
      window.clearInterval(interval);
    };

  }, [loadJourney]);


  // =====================================
  // LOADING
  // =====================================

  if (loading) {

    return (
      <div className="admin-journey-page">

        <div className="admin-journey-message">

          <h2>
            📡 Loading User Location
          </h2>

          <p>
            Retrieving the latest monitoring
            information...
          </p>

        </div>

      </div>
    );

  }


  // =====================================
  // ERROR
  // =====================================

  if (error) {

    return (
      <div className="admin-journey-page">

        <div className="admin-journey-message">

          <h2>
            ⚠️ Unable to Load Journey
          </h2>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/users")
            }
          >
            ← Back to Users
          </button>

        </div>

      </div>
    );

  }


  const session =
    journey?.session || {};

  const locations =
    journey?.locations || [];

  const riskEvents =
    journey?.risk_events || [];


  // Latest location is last item because
  // backend orders locations ASC.

  const latestLocation =
    locations.length > 0
      ? locations[locations.length - 1]
      : null;


  const latestRisk =
    riskEvents.length > 0
      ? riskEvents[riskEvents.length - 1]
      : null;


  const latitude =
    latestLocation?.latitude;

  const longitude =
    latestLocation?.longitude;


  const hasLocation =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined;


  const googleMapsUrl =
    hasLocation
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null;


  return (

    <div className="admin-journey-page">


      {/* HEADER */}

      <header className="admin-journey-header">

        <button
          type="button"
          onClick={() =>
            navigate("/admin/users")
          }
        >
          ← Users
        </button>


        <div>

          <p className="admin-journey-label">
            ADMIN LOCATION MONITORING
          </p>

          <h1>
            📍 User Live Location
          </h1>

          <p>
            Viewing the latest available
            NightGuard monitoring information.
          </p>

        </div>


        <span
          className={
            session.status === "Active"
              ? "admin-journey-live"
              : "admin-journey-ended"
          }
        >
          {session.status === "Active"
            ? "● LIVE"
            : session.status || "UNKNOWN"}
        </span>

      </header>


      <main className="admin-journey-content">


        {/* USER */}

        <section className="admin-journey-user-card">

          <div className="admin-journey-avatar">
            👤
          </div>


          <div>

            <h2>
              {session.full_name ||
                "NightGuard User"}
            </h2>

            <p>
              User ID:{" "}
              {session.user_id ?? "N/A"}
            </p>

            <p>
              Session ID:{" "}
              {session.session_id ?? sessionId}
            </p>

          </div>

        </section>


        {/* INFORMATION */}

        <section className="admin-journey-stats">


          <div>

            <span>
              Destination
            </span>

            <strong>
              {session.destination ||
                "Not available"}
            </strong>

          </div>


          <div>

            <span>
              Risk Level
            </span>

            <strong>
              {latestRisk?.risk_level ||
                "Low"}
            </strong>

          </div>


          <div>

            <span>
              Risk Score
            </span>

            <strong>
              {latestRisk?.risk_score ??
                session.final_risk_score ??
                0}
            </strong>

          </div>


          <div>

            <span>
              Walking Speed
            </span>

            <strong>
              {latestLocation?.speed != null
                ? `${Number(
                    latestLocation.speed
                  ).toFixed(2)} m/s`
                : "N/A"}
            </strong>

          </div>


          <div>

            <span>
              Stationary Time
            </span>

            <strong>
              {latestLocation
                ?.stationary_duration != null
                ? `${latestLocation.stationary_duration} sec`
                : "N/A"}
            </strong>

          </div>


          <div>

            <span>
              Location Updated
            </span>

            <strong>
              {latestLocation?.recorded_at
                ? new Date(
                    latestLocation.recorded_at
                  ).toLocaleString()
                : "Not available"}
            </strong>

          </div>

        </section>


        {/* LOCATION */}

        <section className="admin-location-card">

          <div className="admin-location-title">

            <div>

              <p className="admin-journey-label">
                LOCATION
              </p>

              <h2>
                📍 Latest User Location
              </h2>

            </div>


            {session.status === "Active" && (

              <span className="admin-location-updating">
                ● Updating every 5 seconds
              </span>

            )}

          </div>


          {hasLocation ? (

            <>

              <div className="admin-coordinate-grid">

                <div>

                  <span>
                    Latitude
                  </span>

                  <strong>
                    {Number(latitude).toFixed(6)}
                  </strong>

                </div>


                <div>

                  <span>
                    Longitude
                  </span>

                  <strong>
                    {Number(longitude).toFixed(6)}
                  </strong>

                </div>

              </div>


              <div className="admin-map-frame">

                <iframe
                  title="User live location"
                  src={
                    `https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`
                  }
                  width="100%"
                  height="100%"
                  style={{
                    border: 0
                  }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

              </div>


              <a
                className="admin-open-map-btn"
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                📍 Open in Google Maps
              </a>

            </>

          ) : (

            <div className="admin-no-location">

              <div>
                📍
              </div>

              <h3>
                Location Not Available
              </h3>

              <p>
                NightGuard has not received
                a GPS location for this
                monitoring session yet.
              </p>

            </div>

          )}

        </section>


        {/* RISK REASON */}

        {latestRisk && (

          <section className="admin-risk-card">

            <p className="admin-journey-label">
              CURRENT SAFETY ASSESSMENT
            </p>

            <h2>
              ⚠️ Risk Information
            </h2>

            <p>
              <strong>Level:</strong>{" "}
              {latestRisk.risk_level}
            </p>

            <p>
              <strong>Score:</strong>{" "}
              {latestRisk.risk_score}
            </p>

            <p>
              <strong>Reason:</strong>{" "}
              {latestRisk.reason ||
                "Monitoring active"}
            </p>

          </section>

        )}


      </main>

    </div>

  );

}


export default AdminLiveJourney;