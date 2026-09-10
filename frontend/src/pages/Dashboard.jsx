import {
  useEffect,
  useState
} from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import axios from "axios";

import "../styles/Dashboard.css";
import API_BASE_URL from "../api";


function Dashboard() {

  const navigate = useNavigate();
  const location = useLocation();


  let user = null;

  try {

    const savedUser =
      localStorage.getItem("user");

    user = savedUser
      ? JSON.parse(savedUser)
      : null;

  } catch (error) {

    console.error(
      "Unable to read user data:",
      error
    );
  }


  const [
    statistics,
    setStatistics
  ] = useState({
    total_journeys: 0,
    safe_journeys: 0,
    sos_activated: 0,
    cancelled_journeys: 0
  });


  const [
    loadingStatistics,
    setLoadingStatistics
  ] = useState(true);


  const [
    showJourneyOverview,
    setShowJourneyOverview
  ] = useState(false);


  const [
    loginToast,
    setLoginToast
  ] = useState(
    location.state?.loginSuccess
      ? (
          location.state?.loginMessage ||
          "Login successful"
        )
      : ""
  );


  // =========================================
  // LOGIN SUCCESS TOAST
  // =========================================

  useEffect(() => {

    if (!loginToast) {
      return;
    }

    const timer =
      window.setTimeout(() => {

        setLoginToast("");

      }, 3000);


    window.history.replaceState(
      {},
      document.title
    );


    return () => {
      window.clearTimeout(timer);
    };

  }, [loginToast]);


  // =========================================
  // LOAD USER STATISTICS
  // =========================================

  useEffect(() => {

    if (!user?.id) {

      navigate(
        "/login",
        {
          replace: true
        }
      );

      return;
    }


    const loadStatistics =
      async () => {

        try {

          setLoadingStatistics(true);


          const response =
            await axios.get(
              `${API_BASE_URL}/monitoring/user/${user.id}/statistics`
            );


          setStatistics({

            total_journeys:
              response.data.total_journeys ??
              0,

            safe_journeys:
              response.data.safe_journeys ??
              0,

            sos_activated:
              response.data.sos_activated ??
              0,

            cancelled_journeys:
              response.data.cancelled_journeys ??
              0

          });


        } catch (error) {

          console.error(
            "Unable to load journey statistics:",
            error
          );


        } finally {

          setLoadingStatistics(false);

        }
      };


    loadStatistics();

  }, [
    navigate,
    user?.id
  ]);


  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = () => {

    localStorage.removeItem("user");

    navigate(
      "/login",
      {
        replace: true
      }
    );
  };


  return (

    <div className="dashboard-page">


      {/* LOGIN SUCCESS */}

      {loginToast && (

        <div className="dashboard-login-toast">

          ✓ {loginToast}

        </div>

      )}


      {/* =====================================
          HEADER
      ===================================== */}

      <header className="dashboard-header">

        <div
          className="dashboard-logo"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          🌙 NightGuard
        </div>


        <button
          type="button"
          className="logout-header-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

      </header>


      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <main className="dashboard-content">


        {/* WELCOME */}

        <section className="welcome-section">

          <p className="welcome-label">
            USER DASHBOARD
          </p>

          <h1>
            Welcome back,{" "}
            {user?.full_name || "User"} 👋
          </h1>

          <p className="welcome-subtitle">
            Stay safe, stay aware.
          </p>

        </section>


        {/* =====================================
            MAIN DASHBOARD GRID
        ===================================== */}

        <section className="dashboard-grid">


          {/* START NIGHT MONITORING */}

          <button
            type="button"
            className="
              dashboard-action-card
              monitoring-action-card
            "
            onClick={() =>
              navigate("/monitoring")
            }
          >

            <span className="dashboard-card-icon">
              🌙
            </span>

            <span className="dashboard-card-title">
              Start Night Monitoring
            </span>

            <span className="dashboard-card-description">
              Start your monitored walking journey.
            </span>

          </button>


          {/* JOURNEY OVERVIEW */}

          <button
            type="button"
            className={`
              dashboard-action-card
              ${
                showJourneyOverview
                  ? "active-dashboard-card"
                  : ""
              }
            `}
            onClick={() =>
              setShowJourneyOverview(
                (current) => !current
              )
            }
            aria-expanded={
              showJourneyOverview
            }
          >

            <span className="dashboard-card-icon">
              📊
            </span>

            <span className="dashboard-card-title">
              Journey Overview
            </span>

            <span className="dashboard-card-description">
              View your journey statistics.
            </span>

          </button>


          {/* TRUSTED CONTACTS */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={() =>
              navigate("/contacts")
            }
          >

            <span className="dashboard-card-icon">
              👥
            </span>

            <span className="dashboard-card-title">
              Trusted Contacts
            </span>

            <span className="dashboard-card-description">
              Manage emergency contacts.
            </span>

          </button>


          {/* EMERGENCY ALERT */}

          <button
            type="button"
            className="
              dashboard-action-card
              emergency-action-card
            "
            onClick={() =>
              navigate("/emergency")
            }
          >

            <span className="dashboard-card-icon">
              🚨
            </span>

            <span className="dashboard-card-title">
              Emergency Alert
            </span>

            <span className="dashboard-card-description">
              Access emergency assistance.
            </span>

          </button>


          {/* ALERT HISTORY */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={() =>
              navigate("/history")
            }
          >

            <span className="dashboard-card-icon">
              📜
            </span>

            <span className="dashboard-card-title">
              Alert History
            </span>

            <span className="dashboard-card-description">
              View previous safety alerts.
            </span>

          </button>


          {/* SETTINGS */}

          <button
            type="button"
            className="dashboard-action-card"
            onClick={() =>
              navigate("/settings")
            }
          >

            <span className="dashboard-card-icon">
              ⚙️
            </span>

            <span className="dashboard-card-title">
              Settings
            </span>

            <span className="dashboard-card-description">
              Manage your preferences.
            </span>

          </button>


        </section>


        {/* =====================================
            JOURNEY OVERVIEW
        ===================================== */}

        {showJourneyOverview && (

          <section className="journey-overview-panel">

            <div className="journey-overview-header">

              <div>

                <p className="journey-overview-label">
                  JOURNEY STATISTICS
                </p>

                <h2>
                  Journey Overview
                </h2>

              </div>


              <button
                type="button"
                className="overview-close-btn"
                onClick={() =>
                  setShowJourneyOverview(false)
                }
                aria-label="Close journey overview"
              >
                ×
              </button>

            </div>


            <div className="dashboard-statistics">


              <div className="dashboard-stat-card">

                <span className="stat-icon">
                  🚶
                </span>

                <div>

                  <p>
                    Total Journeys
                  </p>

                  <strong>

                    {loadingStatistics
                      ? "..."
                      : statistics.total_journeys}

                  </strong>

                </div>

              </div>


              <div className="
                dashboard-stat-card
                safe-stat-card
              ">

                <span className="stat-icon">
                  🛡️
                </span>

                <div>

                  <p>
                    Safe Journeys
                  </p>

                  <strong>

                    {loadingStatistics
                      ? "..."
                      : statistics.safe_journeys}

                  </strong>

                </div>

              </div>


              <div className="
                dashboard-stat-card
                sos-stat-card
              ">

                <span className="stat-icon">
                  🚨
                </span>

                <div>

                  <p>
                    SOS Activated
                  </p>

                  <strong>

                    {loadingStatistics
                      ? "..."
                      : statistics.sos_activated}

                  </strong>

                </div>

              </div>


              <div className="
                dashboard-stat-card
                cancelled-stat-card
              ">

                <span className="stat-icon">
                  ❌
                </span>

                <div>

                  <p>
                    Cancelled Journeys
                  </p>

                  <strong>

                    {loadingStatistics
                      ? "..."
                      : statistics.cancelled_journeys}

                  </strong>

                </div>

              </div>


            </div>

          </section>

        )}


        {/* =====================================
            PROFILE
        ===================================== */}

        <section className="profile-card">

          <div className="profile-icon">
            👤
          </div>


          <div className="profile-details">

            <p className="profile-label">
              YOUR PROFILE
            </p>

            <h2>
              {user?.full_name || "User"}
            </h2>

            <p>
              {user?.email || "Email not available"}
            </p>

            {user?.phone_number && (

              <p>
                {user.phone_number}
              </p>

            )}

          </div>


          <button
            type="button"
            className="profile-settings-btn"
            onClick={() =>
              navigate("/settings")
            }
          >
            Manage
          </button>

        </section>


      </main>

    </div>

  );
}


export default Dashboard;