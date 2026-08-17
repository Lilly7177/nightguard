import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import axios from "axios";

import API_BASE_URL from "../api";
import "../styles/AdminLiveMonitoring.css";


function AdminLiveMonitoring() {

  const navigate = useNavigate();

  const [
    activeUsers,
    setActiveUsers
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");


  // ==========================================
  // LOAD ACTIVE JOURNEYS
  // ==========================================

  const loadActiveUsers = async () => {

    try {

      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/admin/live-monitoring`
      );

      console.log(
        "Admin live monitoring:",
        response.data
      );


      setActiveUsers(
        response.data.journeys || []
      );

    } catch (error) {

      console.error(
        "Unable to load active monitoring:",
        error
      );


      setError(
        error.response?.data?.detail ||
        "Unable to load live monitoring data."
      );

    } finally {

      setLoading(false);

    }

  };


  // ==========================================
  // AUTO REFRESH EVERY 5 SECONDS
  // ==========================================

  useEffect(() => {

    loadActiveUsers();


    const interval = setInterval(
      () => {

        loadActiveUsers();

      },
      5000
    );


    return () => {

      clearInterval(interval);

    };

  }, []);


  // ==========================================
  // OPEN USER LOCATION
  // ==========================================

  const handleViewLocation = (
    user
  ) => {

    const userId =
      user.user_id ??
      user.id;


    if (!userId) {

      alert(
        "Unable to identify this user."
      );

      return;

    }


    navigate(
      `/admin/users/${userId}/location`
    );

  };


  // ==========================================
  // FORMAT SPEED
  // ==========================================

  const formatSpeed = (
    speed
  ) => {

    if (
      speed === null ||
      speed === undefined
    ) {

      return "N/A";

    }


    const number =
      Number(speed);


    if (
      Number.isNaN(number)
    ) {

      return "N/A";

    }


    return `${number.toFixed(2)} m/s`;

  };


  // ==========================================
  // FORMAT RISK
  // ==========================================

  const getRiskClass = (
    level
  ) => {

    const risk =
      String(
        level || ""
      ).toLowerCase();


    if (
      risk === "critical"
    ) {

      return "risk-critical";

    }


    if (
      risk === "high"
    ) {

      return "risk-high";

    }


    if (
      risk === "medium"
    ) {

      return "risk-medium";

    }


    return "risk-low";

  };


  // ==========================================
  // PAGE
  // ==========================================

  return (

    <div className="admin-live-page">


      {/* ======================================
          HEADER
      ====================================== */}

      <header
        className="admin-live-header"
      >

        <button
          type="button"
          onClick={() =>
            navigate(
              "/admin/dashboard"
            )
          }
        >
          ← Dashboard
        </button>


        <div
          className="admin-live-title"
        >

          <p
            className="admin-live-label"
          >
            REAL-TIME MONITORING
          </p>


          <h1>
            📍 Live Monitoring
          </h1>


          <p>
            Monitor users who currently
            have an active NightGuard
            journey.
          </p>

        </div>


        <div
          className="admin-live-status"
        >

          <span></span>

          LIVE

        </div>

      </header>



      {/* ======================================
          MAIN CONTENT
      ====================================== */}

      <main
        className="admin-live-content"
      >


        {/* LOADING */}

        {loading && (

          <div
            className="admin-live-message"
          >

            <div
              className="admin-live-loading-icon"
            >
              📡
            </div>


            <h2>
              Loading Live Monitoring
            </h2>


            <p>
              Checking for active
              NightGuard journeys...
            </p>

          </div>

        )}



        {/* ERROR */}

        {!loading && error && (

          <div
            className="
              admin-live-message
              error
            "
          >

            <div
              className="admin-live-error-icon"
            >
              ⚠️
            </div>


            <h2>
              Unable to load monitoring
            </h2>


            <p>
              {error}
            </p>


            <button
              type="button"
              onClick={
                loadActiveUsers
              }
            >
              Try Again
            </button>

          </div>

        )}



        {/* NO ACTIVE JOURNEYS */}

        {!loading &&
          !error &&
          activeUsers.length === 0 && (

          <div
            className="admin-live-empty"
          >

            <div
              className="admin-live-empty-icon"
            >
              📍
            </div>


            <h2>
              No Active Journeys
            </h2>


            <p>
              There are currently no users
              being monitored.
            </p>


            <p>
              When a user starts a NightGuard
              journey, they will automatically
              appear here.
            </p>

          </div>

        )}



        {/* ACTIVE JOURNEYS */}

        {!loading &&
          !error &&
          activeUsers.length > 0 && (

          <>


            {/* SUMMARY */}

            <section
              className="admin-live-summary"
            >

              <div>

                <span>
                  Active Monitoring
                </span>


                <strong>
                  {
                    activeUsers.length
                  }
                </strong>

              </div>


              <div>

                <span>
                  Monitoring Status
                </span>


                <strong
                  className="live-green"
                >
                  ● Live
                </strong>

              </div>

            </section>



            {/* USERS */}

            <section
              className="admin-live-grid"
            >

              {
                activeUsers.map(
                  (
                    user,
                    index
                  ) => {


                    const userId =
                      user.user_id ??
                      user.id;


                    const userName =
                      user.full_name ||
                      user.user_name ||
                      user.name ||
                      `User #${
                        userId ??
                        "Unknown"
                      }`;


                    const riskLevel =
                      user.risk_level ||
                      user.latest_risk ||
                      "Low";


                    return (

                      <article
                        className="
                          admin-live-user-card
                        "
                        key={
                          user.session_id ??
                          `${
                            userId
                          }-${index}`
                        }
                      >


                        {/* USER HEADER */}

                        <div
                          className="
                            admin-live-user-top
                          "
                        >

                          <div
                            className="
                              admin-live-avatar
                            "
                          >
                            👤
                          </div>


                          <div
                            className="
                              admin-live-user-name
                            "
                          >

                            <h2>
                              {userName}
                            </h2>


                            <p>
                              User ID:{" "}
                              {
                                userId ??
                                "N/A"
                              }
                            </p>

                          </div>


                          <span
                            className="
                              admin-live-badge
                            "
                          >
                            ● LIVE
                          </span>

                        </div>



                        {/* INFORMATION */}

                        <div
                          className="
                            admin-live-information
                          "
                        >


                          {/* DESTINATION */}

                          <div>

                            <span>
                              Destination
                            </span>


                            <strong>
                              {
                                user.destination ||
                                "Not available"
                              }
                            </strong>

                          </div>



                          {/* RISK */}

                          <div>

                            <span>
                              Risk Level
                            </span>


                            <strong
                              className={
                                getRiskClass(
                                  riskLevel
                                )
                              }
                            >
                              {riskLevel}
                            </strong>

                          </div>



                          {/* RISK SCORE */}

                          <div>

                            <span>
                              Risk Score
                            </span>


                            <strong>

                              {
                                user.risk_score ??
                                "N/A"
                              }

                            </strong>

                          </div>



                          {/* SPEED */}

                          <div>

                            <span>
                              Walking Speed
                            </span>


                            <strong>

                              {
                                formatSpeed(
                                  user.speed
                                )
                              }

                            </strong>

                          </div>



                          {/* STATIONARY */}

                          <div>

                            <span>
                              Stationary Time
                            </span>


                            <strong>

                              {
                                user.stationary_seconds !=
                                null

                                  ? `${
                                      user.stationary_seconds
                                    } sec`

                                  : "N/A"
                              }

                            </strong>

                          </div>



                          {/* SESSION */}

                          <div>

                            <span>
                              Journey Session
                            </span>


                            <strong>

                              {
                                user.session_id ??
                                "N/A"
                              }

                            </strong>

                          </div>

                        </div>



                        {/* LOCATION */}

                        <button
                          type="button"
                          className="
                            admin-track-user-btn
                          "
                          onClick={() =>
                            handleViewLocation(
                              user
                            )
                          }
                        >

                          📍 View Live Location

                        </button>

                      </article>

                    );

                  }
                )
              }

            </section>

          </>

        )}

      </main>

    </div>

  );

}


export default AdminLiveMonitoring;