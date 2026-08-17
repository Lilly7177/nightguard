import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import axios from "axios";

import API_BASE_URL from "../api";

import "../styles/AdminReports.css";


function AdminStatistics() {
  const navigate = useNavigate();

  const [stats, setStats] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    const loadStatistics =
      async () => {

        try {

          const response =
            await axios.get(
              `${API_BASE_URL}/admin/statistics`
            );

          setStats(
            response.data
          );

        } catch (error) {

          console.error(
            "Statistics error:",
            error
          );

        } finally {

          setLoading(false);
        }
      };


    loadStatistics();

  }, []);


  if (loading) {

    return (
      <div className="admin-data-loading">
        Loading statistics...
      </div>
    );
  }


  const cards = [

    {
      icon: "👥",
      title: "Registered Users",
      value: stats?.total_users || 0
    },

    {
      icon: "🚶",
      title: "Total Journeys",
      value: stats?.total_journeys || 0
    },

    {
      icon: "✅",
      title: "Safe Journeys",
      value: stats?.safe_journeys || 0
    },

    {
      icon: "🚨",
      title: "Emergency Journeys",
      value:
        stats?.emergency_journeys || 0
    },

    {
      icon: "📡",
      title: "Active Monitoring",
      value:
        stats?.active_journeys || 0
    },

    {
      icon: "🚨",
      title: "Total Alerts",
      value: stats?.total_alerts || 0
    },

    {
      icon: "⚠",
      title: "Active Alerts",
      value: stats?.active_alerts || 0
    },

    {
      icon: "✔",
      title: "Resolved Alerts",
      value:
        stats?.resolved_alerts || 0
    },

    {
      icon: "📞",
      title: "Trusted Contacts",
      value:
        stats?.trusted_contacts || 0
    }

  ];


  return (
    <div className="admin-data-page">

      <aside className="admin-data-sidebar">

        <h2>🌙 NightGuard</h2>

        <p>ADMIN CONTROL</p>

        <button
          onClick={() =>
            navigate(
              "/admin/dashboard"
            )
          }
        >
          🏠 Dashboard
        </button>

        <button
          onClick={() =>
            navigate(
              "/admin/reports"
            )
          }
        >
          📄 Reports
        </button>

        <button
          onClick={() =>
            navigate(
              "/admin/analytics"
            )
          }
        >
          📈 Analytics
        </button>

        <button
          className="active"
        >
          📊 Statistics
        </button>

      </aside>


      <main className="admin-data-main">

        <div className="admin-data-heading">

          <div>

            <span>
              SYSTEM PERFORMANCE
            </span>

            <h1>
              📊 NightGuard Statistics
            </h1>

            <p>
              Overall platform safety and
              monitoring statistics.
            </p>

          </div>

        </div>


        <section className="statistics-grid">

          {cards.map(
            (card) => (

              <div
                className="statistics-card"
                key={card.title}
              >

                <div className="statistics-icon">

                  {card.icon}

                </div>

                <span>
                  {card.title}
                </span>

                <strong>
                  {card.value}
                </strong>

              </div>

            )
          )}

        </section>


        <section className="success-rate-panel">

          <div>

            <span>
              JOURNEY SUCCESS RATE
            </span>

            <h2>
              Safe Journey Performance
            </h2>

          </div>


          <div className="success-rate-circle">

            <strong>

              {
                stats
                  ?.journey_success_rate ||
                0
              }
              %

            </strong>

            <span>
              Completed Safely
            </span>

          </div>

        </section>

      </main>

    </div>
  );
}


export default AdminStatistics;