import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/History.css";
import API_BASE_URL from "../api";

function History() {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  let user = null;

  try {
    const savedUser = localStorage.getItem("user");
    user = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error("Unable to read user data:", error);
  }

  useEffect(() => {
    const loadAlerts = async () => {
      if (!user?.id) {
        setError("Please login to view alert history.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE_URL}/alerts/user/${user.id}`
        );

        setAlerts(response.data.alerts || []);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.detail ||
          "Unable to load alert history."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [user?.id]);

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Not available";
    }

    return new Date(dateValue).toLocaleString();
  };

  return (
    <div className="history-page">

      <header className="history-header">

        <button
          type="button"
          className="history-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <div className="history-logo">
          🌙 NightGuard
        </div>

      </header>

      <main className="history-content">

        <section className="history-intro">

          <p className="history-label">
            SAFETY RECORDS
          </p>

          <h1>📜 Alert History</h1>

          <p>
            Review your previous emergency alerts, locations and current
            alert status.
          </p>

        </section>

        <section className="history-summary">

          <div className="summary-card">
            <span>Total Alerts</span>
            <strong>{alerts.length}</strong>
          </div>

          <div className="summary-card">
            <span>Active Alerts</span>
            <strong>
              {
                alerts.filter(
                  (alert) =>
                    alert.status?.toLowerCase() === "active"
                ).length
              }
            </strong>
          </div>

          <div className="summary-card">
            <span>Resolved Alerts</span>
            <strong>
              {
                alerts.filter(
                  (alert) =>
                    alert.status?.toLowerCase() === "resolved"
                ).length
              }
            </strong>
          </div>

        </section>

        <section className="history-panel">

          {loading && (
            <div className="history-message">
              Loading alert history...
            </div>
          )}

          {!loading && error && (
            <div className="history-message history-error">
              {error}
            </div>
          )}

          {!loading && !error && alerts.length === 0 && (
            <div className="history-empty">

              <div className="history-empty-icon">
                📜
              </div>

              <h2>No emergency alerts yet</h2>

              <p>
                Alerts created from the Emergency SOS page will appear here.
              </p>

              <button
                type="button"
                onClick={() => navigate("/emergency")}
              >
                Open Emergency SOS
              </button>

            </div>
          )}

          {!loading && !error && alerts.length > 0 && (
            <div className="history-list">

              {alerts.map((alert) => (

                <article
                  className="history-card"
                  key={alert.id}
                >

                  <div className="history-card-top">

                    <div>
                      <span className="alert-number">
                        ALERT #{alert.id}
                      </span>

                      <h2>
                        🚨 {alert.alert_type}
                      </h2>
                    </div>

                    <span
                      className={`history-status ${
                        alert.status?.toLowerCase() === "active"
                          ? "status-active"
                          : alert.status?.toLowerCase() === "resolved"
                          ? "status-resolved"
                          : "status-cancelled"
                      }`}
                    >
                      {alert.status}
                    </span>

                  </div>

                  <div className="history-card-grid">

                    <div>
                      <span>Location</span>
                      <p>{alert.location || "Not available"}</p>
                    </div>

                    <div>
                      <span>Date and Time</span>
                      <p>{formatDate(alert.created_at)}</p>
                    </div>

                  </div>

                  <div className="history-message-box">

                    <span>Emergency Message</span>

                    <p>
                      {alert.message || "No message provided"}
                    </p>

                  </div>

                </article>

              ))}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default History;