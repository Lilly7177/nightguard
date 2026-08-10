import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminDashboard.css";
import API_BASE_URL from "../api";

function AdminDashboard() {
  const navigate = useNavigate();

  let admin = null;

  try {
    const savedAdmin = localStorage.getItem("admin");
    admin = savedAdmin ? JSON.parse(savedAdmin) : null;
  } catch (error) {
    console.error("Unable to read admin data:", error);
  }

  const [stats, setStats] = useState({
    users: 0,
    alerts: 0,
    active: 0,
    resolved: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!admin?.id) {
      navigate("/admin");
      return;
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_BASE_URL}/admin/dashboard`
        );

        setStats(response.data);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.detail ||
          "Unable to load admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [admin?.id, navigate]);

  const logout = () => {
    localStorage.removeItem("admin");
    navigate("/admin");
  };

  return (
    <div className="admin-dashboard">

      <header className="admin-header">

        <h2>🌙 NightGuard Admin</h2>

        <div className="admin-header-user">

          <span>
            Welcome, {admin?.full_name || "Admin"}
          </span>

          <button
            type="button"
            onClick={logout}
          >
            Logout
          </button>

        </div>

      </header>

      <main>

        <section className="admin-dashboard-intro">

          <p className="admin-dashboard-label">
            ADMIN CONTROL PANEL
          </p>

          <h1>Admin Dashboard</h1>

          <p>
            Monitor users, emergency alerts and system activity.
          </p>

        </section>

        {loading && (
          <div className="admin-dashboard-message">
            Loading dashboard statistics...
          </div>
        )}

        {!loading && error && (
          <div className="admin-dashboard-message admin-dashboard-error">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="stats-grid">

              <div className="stat-card">
                <span className="stat-icon">👥</span>
                <h3>Total Users</h3>
                <h2>{stats.users}</h2>
              </div>

              <div className="stat-card">
                <span className="stat-icon">🚨</span>
                <h3>Total Alerts</h3>
                <h2>{stats.alerts}</h2>
              </div>

              <div className="stat-card">
                <span className="stat-icon">⚠️</span>
                <h3>Active Alerts</h3>
                <h2>{stats.active}</h2>
              </div>

              <div className="stat-card">
                <span className="stat-icon">✅</span>
                <h3>Resolved Alerts</h3>
                <h2>{stats.resolved}</h2>
              </div>

            </section>

            <section className="admin-actions">

              <button
                type="button"
                onClick={() => navigate("/admin/users")}
              >
                <span>👥</span>
                <div>
                  <strong>Manage Users</strong>
                  <p>View all registered NightGuard users.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/alerts")}
              >
                <span>🚨</span>
                <div>
                  <strong>Emergency Alerts</strong>
                  <p>Review and manage emergency alerts.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/contacts")}
              >
                <span>📞</span>
                <div>
                  <strong>Trusted Contacts</strong>
                  <p>View contacts registered by users.</p>
                </div>
              </button>

            </section>
          </>
        )}

      </main>

    </div>
  );
}

export default AdminDashboard;