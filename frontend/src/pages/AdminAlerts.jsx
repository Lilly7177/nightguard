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

  // =====================================
  // Load Emergency Alerts
  // =====================================

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/admin/alerts`
      );

      setAlerts(response.data.alerts || []);

    } catch (error) {
      console.error("Unable to load alerts:", error);

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

  // =====================================
  // Update Alert Status
  // =====================================

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
        currentAlerts.map((alertItem) =>
          alertItem.id === alertId
            ? {
                ...alertItem,
                status: newStatus
              }
            : alertItem
        )
      );

    } catch (error) {
      console.error("Unable to update alert:", error);

      window.alert(
        error.response?.data?.detail ||
        "Unable to update alert status."
      );

    } finally {
      setUpdatingId(null);
    }
  };

  // =====================================
  // Format Date
  // =====================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Not available";
    }

    return new Date(dateValue).toLocaleString();
  };

  // =====================================
  // Alert Counts
  // =====================================

  const activeAlerts = alerts.filter(
    (alertItem) =>
      alertItem.status?.toLowerCase() === "active"
  ).length;

  const resolvedAlerts = alerts.filter(
    (alertItem) =>
      alertItem.status?.toLowerCase() === "resolved"
  ).length;

  // =====================================
  // Page
  // =====================================

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

        {/* ============================= */}
        {/* Summary */}
        {/* ============================= */}

        <section className="admin-alerts-summary">

          <div className="admin-alert-summary-card">
            <span>Total Alerts</span>
            <strong>{alerts.length}</strong>
          </div>

          <div className="admin-alert-summary-card">
            <span>Active</span>
            <strong>{activeAlerts}</strong>
          </div>

          <div className="admin-alert-summary-card">
            <span>Resolved</span>
            <strong>{resolvedAlerts}</strong>
          </div>

        </section>

        {/* ============================= */}
        {/* Loading */}
        {/* ============================= */}

        {loading && (
          <div className="admin-alerts-message">
            Loading emergency alerts...
          </div>
        )}

        {/* ============================= */}
        {/* Error */}
        {/* ============================= */}

        {!loading && error && (
          <div className="admin-alerts-message admin-alerts-error">

            <p>{error}</p>

            <button
              type="button"
              onClick={loadAlerts}
            >
              Try Again
            </button>

          </div>
        )}

        {/* ============================= */}
        {/* No Alerts */}
        {/* ============================= */}

        {!loading && !error && alerts.length === 0 && (
          <div className="admin-alerts-empty">

            <h2>No emergency alerts found</h2>

            <p>
              New SOS and automatic emergency alerts will appear here.
            </p>

          </div>
        )}

        {/* ============================= */}
        {/* Alert List */}
        {/* ============================= */}

        {!loading && !error && alerts.length > 0 && (

          <section className="admin-alerts-list">

            {alerts.map((alertItem) => (

              <article
                className="admin-alert-card"
                key={alertItem.id}
              >

                {/* Alert Header */}

                <div className="admin-alert-card-header">

                  <div>

                    <span className="admin-alert-id">
                      ALERT #{alertItem.id}
                    </span>

                    <h2>
                      🚨 {alertItem.alert_type || "Emergency"}
                    </h2>

                  </div>

                  <span
                    className={`admin-alert-status ${
                      alertItem.status?.toLowerCase() === "active"
                        ? "admin-status-active"
                        : alertItem.status?.toLowerCase() === "resolved"
                        ? "admin-status-resolved"
                        : "admin-status-cancelled"
                    }`}
                  >
                    {alertItem.status || "Unknown"}
                  </span>

                </div>

                {/* Alert Details */}

                <div className="admin-alert-details-grid">

                  <div>
                    <span>User</span>

                    <p>
                      {alertItem.full_name || "Not available"}
                    </p>
                  </div>

                  <div>
                    <span>Phone Number</span>

                    <p>
                      {alertItem.phone_number || "Not available"}
                    </p>
                  </div>

                  <div>
                    <span>Location</span>

                    <p>
                      {alertItem.location || "Not available"}
                    </p>
                  </div>

                  <div>
                    <span>Date and Time</span>

                    <p>
                      {formatDate(alertItem.created_at)}
                    </p>
                  </div>

                </div>

                {/* Emergency Message */}

                <div className="admin-alert-message-box">

                  <span>Emergency Message</span>

                  <p>
                    {alertItem.message || "No message provided"}
                  </p>

                </div>

                {/* Actions */}

                <div className="admin-alert-actions">

                  {alertItem.status?.toLowerCase() !== "resolved" && (

                    <button
                      type="button"
                      className="resolve-alert-btn"
                      disabled={updatingId === alertItem.id}
                      onClick={() =>
                        updateAlertStatus(
                          alertItem.id,
                          "Resolved"
                        )
                      }
                    >

                      {updatingId === alertItem.id
                        ? "Updating..."
                        : "✅ Mark Resolved"}

                    </button>

                  )}

                  {alertItem.status?.toLowerCase() !== "cancelled" && (

                    <button
                      type="button"
                      className="cancel-alert-btn"
                      disabled={updatingId === alertItem.id}
                      onClick={() =>
                        updateAlertStatus(
                          alertItem.id,
                          "Cancelled"
                        )
                      }
                    >
                      {updatingId === alertItem.id
                        ? "Updating..."
                        : "Cancel Alert"}
                    </button>

                  )}

                  {alertItem.status?.toLowerCase() === "resolved" && (

                    <span className="resolved-label">
                      ✅ Alert successfully resolved
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