import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import axios from "axios";

import "../styles/Dashboard.css";
import API_BASE_URL from "../api";

function Dashboard() {
  const navigate = useNavigate();

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


  const [statistics, setStatistics] =
    useState({
      total_journeys: 0,
      safe_journeys: 0,
      sos_activated: 0,
      cancelled_journeys: 0
    });

  const [
    loadingStatistics,
    setLoadingStatistics
  ] = useState(true);


  useEffect(() => {
    if (!user?.id) {
      navigate("/login", {
        replace: true
      });

      return;
    }

    const loadStatistics = async () => {
      try {
        setLoadingStatistics(true);

        const response = await axios.get(
          `${API_BASE_URL}/monitoring/user/${user.id}/statistics`
        );

        setStatistics({
          total_journeys:
            response.data.total_journeys ?? 0,

          safe_journeys:
            response.data.safe_journeys ?? 0,

          sos_activated:
            response.data.sos_activated ?? 0,

          cancelled_journeys:
            response.data.cancelled_journeys ?? 0
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
  }, [navigate, user?.id]);


  const handleLogout = () => {
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true
    });
  };


  return (
    <div className="dashboard-page">

      <header className="dashboard-header">

        <div
          className="dashboard-logo"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          🌙 NightGuard
        </div>


        <div className="dashboard-user">

          <span>
            {user?.full_name || "User"}
          </span>

          <button
            type="button"
            className="logout-header-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      <main className="dashboard-content">

        <section className="welcome-section">

          <div>

            <p className="welcome-label">
              USER DASHBOARD
            </p>

            <h1>
              Welcome back,{" "}
              {user?.full_name || "User"} 👋
            </h1>

            <p>
              Manage your safety tools, trusted
              contacts and emergency services from
              one secure place.
            </p>

          </div>


          <div className="status-badge">
            <span className="status-dot"></span>
            System Active
          </div>

        </section>


        <section className="dashboard-statistics">

          <div className="dashboard-stat-card">

            <span className="stat-icon">
              🚶
            </span>

            <div>
              <p>Total Journeys</p>

              <strong>
                {loadingStatistics
                  ? "..."
                  : statistics.total_journeys}
              </strong>
            </div>

          </div>


          <div className="dashboard-stat-card safe-stat-card">

            <span className="stat-icon">
              🛡️
            </span>

            <div>
              <p>Safe Journeys</p>

              <strong>
                {loadingStatistics
                  ? "..."
                  : statistics.safe_journeys}
              </strong>
            </div>

          </div>


          <div className="dashboard-stat-card sos-stat-card">

            <span className="stat-icon">
              🚨
            </span>

            <div>
              <p>SOS Activated</p>

              <strong>
                {loadingStatistics
                  ? "..."
                  : statistics.sos_activated}
              </strong>
            </div>

          </div>


          <div className="dashboard-stat-card cancelled-stat-card">

            <span className="stat-icon">
              ❌
            </span>

            <div>
              <p>Cancelled Journeys</p>

              <strong>
                {loadingStatistics
                  ? "..."
                  : statistics.cancelled_journeys}
              </strong>
            </div>

          </div>

        </section>


        <section className="profile-card">

          <div className="profile-icon">
            👤
          </div>


          <div className="profile-details">

            <h2>
              Your Profile
            </h2>

            <p>
              <strong>Name:</strong>{" "}
              {user?.full_name ||
                "Not available"}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {user?.email ||
                "Not available"}
            </p>

            <p>
              <strong>Phone:</strong>{" "}
              {user?.phone_number ||
                "Not available"}
            </p>

          </div>

        </section>


        <section className="dashboard-grid">

          <button
            type="button"
            className="dashboard-feature-card"
            onClick={() =>
              navigate("/contacts")
            }
          >

            <span className="feature-icon">
              👥
            </span>

            <div>
              <h3>
                Trusted Contacts
              </h3>

              <p>
                Add and manage your emergency
                contacts.
              </p>
            </div>

            <span className="feature-arrow">
              →
            </span>

          </button>


          <button
            type="button"
            className="dashboard-feature-card emergency-card"
            onClick={() =>
              navigate("/emergency")
            }
          >

            <span className="feature-icon">
              🚨
            </span>

            <div>
              <h3>
                Emergency Alert
              </h3>

              <p>
                Send an emergency SOS alert
                instantly.
              </p>
            </div>

            <span className="feature-arrow">
              →
            </span>

          </button>


          <button
            type="button"
            className="dashboard-feature-card"
            onClick={() =>
              navigate("/history")
            }
          >

            <span className="feature-icon">
              📜
            </span>

            <div>
              <h3>
                Alert History
              </h3>

              <p>
                View previous emergency alert
                records.
              </p>
            </div>

            <span className="feature-arrow">
              →
            </span>

          </button>


          <button
            type="button"
            className="dashboard-feature-card"
            onClick={() =>
              navigate("/settings")
            }
          >

            <span className="feature-icon">
              ⚙️
            </span>

            <div>
              <h3>
                Settings
              </h3>

              <p>
                Manage your profile and account
                preferences.
              </p>
            </div>

            <span className="feature-arrow">
              →
            </span>

          </button>

        </section>


        <section className="monitoring-section">

          <button
            type="button"
            className="monitoring-main-card"
            onClick={() =>
              navigate("/monitoring")
            }
          >

            <div className="monitoring-main-content">

              <div className="monitoring-main-icon">
                🌙
              </div>


              <div className="monitoring-main-text">

                <p className="monitoring-main-label">
                  MAIN SAFETY FEATURE
                </p>

                <h2>
                  Start Night Monitoring
                </h2>

                <p>
                  Begin your journey with live GPS
                  tracking, risk monitoring and
                  automatic emergency protection.
                </p>

              </div>

            </div>


            <div className="monitoring-main-action">
              ▶ Start Monitoring
            </div>

          </button>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;