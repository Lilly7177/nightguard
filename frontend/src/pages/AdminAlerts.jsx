import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminAlerts.css";
import API_BASE_URL from "../api";

function AdminAlerts() {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError("");

  

      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
        "Unable to load emergency alerts."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const updateAlertStatus = async (alertId, newStatus) => {
    try {
      setUpdatingId(alertId);

      await axios.put(
        `${API_BASE_URL}/admin/alerts/${alertId}`,
        null,
        {
          params: {
            status: newStatus
          }
        }
      );

      setAlerts((currentAlerts) =>
        currentAlerts.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: newStatus
              }
            : alert
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.detail ||
        "Unable to update alert status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Not available";
    }

    return new Date(dateValue).toLocaleString();
  };

  return (
    <div className="admin-alerts-page">

      <header className="admin-alerts-header">

        <button
          type="button"
          className="admin-alerts-back-btn"
          onClick={() => navigate("/admin/dashboard")}
        >
          ← Admin Dashboard
        </button>

        <h2>🌙 NightGuard Admin</h2>

      </header>

      <main className="admin-alerts-content">

        <section className="admin-alerts-intro">

          <p className="admin-alerts-label">
            EMERGENCY MONITORING
          </p>

          <h1>🚨 Emergency Alerts</h1>

          <p>
            Review emergency incidents and update their current status.
          </p>

        </section>

        <section className="admin-alerts-summary">

          <div className="admin-alert-summary-card">
            <span>Total Alerts</span>
            <strong>{alerts.length}</strong>
          </div>

          <div className="admin-alert-summary-card">
            <span>Active</span>
            <strong>
              {
                alerts.filter(
                  (alert) =>
                    alert.status?.toLowerCase() === "active"
                ).length
              }
            </strong>
          </div>

          <div className="admin-alert-summary-card">
            <span>Resolved</span>
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

        {loading && (
          <div className="admin-alerts-message">
            Loading emergency alerts...
          </div>
        )}

        {!loading && error && (
          <div className="admin-alerts-message admin-alerts-error">
            {error}
          </div>
        )}

        {!loading && !error && alerts.length === 0 && (
          <div className="admin-alerts-empty">
            <h2>No emergency alerts found</h2>
            <p>New SOS alerts will appear here.</p>
          </div>
        )}

        {!loading && !error && alerts.length > 0 && (
          <section className="admin-alerts-list">

            {alerts.map((alert) => (
              <article
                className="admin-alert-card"
                key={alert.id}
              >

                <div className="admin-alert-card-header">

                  <div>
                    <span className="admin-alert-id">
                      ALERT #{alert.id}
                    </span>

                    <h2>
                      🚨 {alert.alert_type || "Emergency"}
                    </h2>
                  </div>

                  <span
                    className={`admin-alert-status ${
                      alert.status?.toLowerCase() === "active"
                        ? "admin-status-active"
                        : alert.status?.toLowerCase() === "resolved"
                        ? "admin-status-resolved"
                        : "admin-status-cancelled"
                    }`}
                  >
                    {alert.status}
                  </span>

                </div>

                <div className="admin-alert-details-grid">

                  <div>
                    <span>User</span>
                    <p>{alert.full_name}</p>
                  </div>

                  <div>
                    <span>Phone Number</span>
                    <p>{alert.phone_number || "Not available"}</p>
                  </div>

                  <div>
                    <span>Location</span>
                    <p>{alert.location || "Not available"}</p>
                  </div>

                  <div>
                    <span>Date and Time</span>
                    <p>{formatDate(alert.created_at)}</p>
                  </div>

                </div>

                <div className="admin-alert-message-box">
                  <span>Emergency Message</span>
                  <p>{alert.message || "No message provided"}</p>
                </div>

                <div className="admin-alert-actions">

                  {alert.status?.toLowerCase() !== "resolved" && (
                    <button
                      type="button"
                      className="resolve-alert-btn"
                      disabled={updatingId === alert.id}
                      onClick={() =>
                        updateAlertStatus(
                          alert.id,
                          "Resolved"
                        )
                      }
                    >
                      {updatingId === alert.id
                        ? "Updating..."
                        : "✅ Mark Resolved"}
                    </button>
                  )}

                  {alert.status?.toLowerCase() !== "cancelled" && (
                    <button
                      type="button"
                      className="cancel-alert-btn"
                      disabled={updatingId === alert.id}
                      onClick={() =>
                        updateAlertStatus(
                          alert.id,
                          "Cancelled"
                        )
                      }
                    >
                      Cancel Alert
                    </button>
                  )}

                  {alert.status?.toLowerCase() === "resolved" && (
                    <span className="resolved-label">
                      Alert successfully resolved
                    </span>
                  )}

                </div>

              </article>
            ))}

          </section>
        )}

      </main>

    </div>
  );
}

export default AdminAlerts;