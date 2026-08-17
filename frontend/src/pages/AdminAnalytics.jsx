import {
  useEffect,
  useState
} from "react";

import axios from "axios";

import API_BASE_URL from "../api";

import "../styles/AdminReports.css";


function AdminAnalytics() {

  const [analytics, setAnalytics] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =========================================
  // LOAD ANALYTICS
  // =========================================

  useEffect(() => {

    const loadAnalytics =
      async () => {

        try {

          setLoading(true);
          setError("");

          const response =
            await axios.get(
              `${API_BASE_URL}/admin/analytics`
            );

          setAnalytics(
            response.data
          );

        } catch (error) {

          console.error(
            "Analytics error:",
            error
          );

          setError(
            error.response?.data?.detail ||
            "Unable to load analytics."
          );

        } finally {

          setLoading(false);

        }
      };


    loadAnalytics();

  }, []);


  // =========================================
  // LOADING
  // =========================================

  if (loading) {

    return (
      <div className="admin-data-loading">
        Loading analytics...
      </div>
    );

  }


  // =========================================
  // ERROR
  // =========================================

  if (error) {

    return (
      <div className="admin-data-message error">

        <h3>
          Unable to Load Analytics
        </h3>

        <p>
          {error}
        </p>

      </div>
    );

  }


  // =========================================
  // RISK DISTRIBUTION
  // =========================================

  const risks =
    analytics?.risk_distribution || {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0
    };


  const maxRisk =
    Math.max(
      ...Object.values(risks),
      1
    );


  // =========================================
  // PAGE
  // =========================================

  return (

    <div className="admin-data-main">


      {/* =====================================
          HEADING
      ===================================== */}

      <div className="admin-data-heading">

        <div>

          <span>
            SAFETY INTELLIGENCE
          </span>

          <h1>
            📈 Journey Analytics
          </h1>

          <p>
            Analyse journey outcomes and
            AI-generated risk activity.
          </p>

        </div>

      </div>



      {/* =====================================
          ANALYTICS CARDS
      ===================================== */}

      <section className="analytics-card-grid">


        <div className="analytics-card">

          <span>
            🚶 Total Journeys
          </span>

          <strong>
            {
              analytics?.total_journeys ||
              0
            }
          </strong>

        </div>


        <div className="analytics-card analytics-success">

          <span>
            ✅ Completed
          </span>

          <strong>
            {
              analytics?.completed ||
              0
            }
          </strong>

        </div>


        <div className="analytics-card analytics-danger">

          <span>
            🚨 Emergencies
          </span>

          <strong>
            {
              analytics?.emergencies ||
              0
            }
          </strong>

        </div>


        <div className="analytics-card analytics-warning">

          <span>
            ⚠ Interrupted
          </span>

          <strong>
            {
              analytics?.interrupted ||
              0
            }
          </strong>

        </div>


        <div className="analytics-card">

          <span>
            ❌ Cancelled
          </span>

          <strong>
            {
              analytics?.cancelled ||
              0
            }
          </strong>

        </div>


        <div className="analytics-card">

          <span>
            🤖 Average Risk
          </span>

          <strong>
            {
              analytics?.average_risk ||
              0
            }
          </strong>

        </div>


      </section>



      {/* =====================================
          RISK DISTRIBUTION
      ===================================== */}

      <section className="analytics-panel">

        <div className="analytics-title">

          <span>
            AI RISK ANALYSIS
          </span>

          <h2>
            Risk Level Distribution
          </h2>

        </div>


        <div className="risk-chart">

          {
            Object.entries(
              risks
            ).map(
              ([level, amount]) => (

                <div
                  className="risk-chart-row"
                  key={level}
                >


                  <div className="risk-chart-label">

                    <span>
                      {level}
                    </span>

                    <strong>
                      {amount}
                    </strong>

                  </div>


                  <div className="risk-chart-track">

                    <div
                      className={
                        `risk-chart-fill ` +
                        `risk-${level.toLowerCase()}`
                      }
                      style={{
                        width:
                          `${
                            (
                              amount /
                              maxRisk
                            ) *
                            100
                          }%`
                      }}
                    />

                  </div>

                </div>

              )
            )
          }

        </div>

      </section>



      {/* =====================================
          JOURNEY OUTCOME OVERVIEW
      ===================================== */}

      <section className="analytics-panel">

        <div className="analytics-title">

          <span>
            JOURNEY OUTCOMES
          </span>

          <h2>
            Monitoring Overview
          </h2>

        </div>


        <div className="journey-outcome-grid">


          <div>

            <span>
              🟢
            </span>

            <strong>
              {
                analytics?.active ||
                0
              }
            </strong>

            <small>
              Active
            </small>

          </div>


          <div>

            <span>
              ✅
            </span>

            <strong>
              {
                analytics?.completed ||
                0
              }
            </strong>

            <small>
              Safe
            </small>

          </div>


          <div>

            <span>
              🚨
            </span>

            <strong>
              {
                analytics?.emergencies ||
                0
              }
            </strong>

            <small>
              Emergency
            </small>

          </div>


          <div>

            <span>
              ⚠
            </span>

            <strong>
              {
                analytics?.interrupted ||
                0
              }
            </strong>

            <small>
              Interrupted
            </small>

          </div>


        </div>

      </section>


    </div>

  );

}


export default AdminAnalytics;