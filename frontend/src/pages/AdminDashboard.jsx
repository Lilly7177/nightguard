import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import axios from "axios";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import "../styles/AdminDashboard.css";

import API_BASE_URL from "../api";


/* =========================================================
   MAP VIEW CONTROLLER
========================================================= */

function AdminMapController({ journeys, selectedJourney }) {
  const map = useMap();

  useEffect(() => {

    if (
      selectedJourney?.latitude !== null &&
      selectedJourney?.longitude !== null &&
      selectedJourney?.latitude !== undefined &&
      selectedJourney?.longitude !== undefined
    ) {

      map.setView(
        [
          Number(selectedJourney.latitude),
          Number(selectedJourney.longitude)
        ],
        16
      );

      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      return;
    }


    const validJourneys = journeys.filter(
      (journey) =>
        journey.latitude !== null &&
        journey.longitude !== null &&
        journey.latitude !== undefined &&
        journey.longitude !== undefined
    );


    if (validJourneys.length === 1) {

      map.setView(
        [
          Number(validJourneys[0].latitude),
          Number(validJourneys[0].longitude)
        ],
        16
      );

    } else if (validJourneys.length > 1) {

      const bounds = validJourneys.map(
        (journey) => [
          Number(journey.latitude),
          Number(journey.longitude)
        ]
      );

      map.fitBounds(bounds, {
        padding: [50, 50]
      });
    }


    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [journeys, selectedJourney, map]);


  return null;
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

function AdminDashboard() {

  const navigate = useNavigate();


  /* =======================================================
     ADMIN
  ======================================================= */

  let admin = null;

  try {

    const savedAdmin =
      localStorage.getItem("admin");

    admin = savedAdmin
      ? JSON.parse(savedAdmin)
      : null;

  } catch (error) {

    console.error(
      "Unable to read admin data:",
      error
    );
  }


  /* =======================================================
     STATE
  ======================================================= */

  const [stats, setStats] = useState({
    users: 0,
    alerts: 0,
    active: 0,
    resolved: 0,
    active_monitoring: 0
  });


  const [alerts, setAlerts] =
    useState([]);


  const [journeys, setJourneys] =
    useState([]);


  const [
    selectedJourney,
    setSelectedJourney
  ] = useState(null);


  const [
    criticalPopup,
    setCriticalPopup
  ] = useState(null);


  const [
    sidebarOpen,
    setSidebarOpen
  ] = useState(false);


  const [loading, setLoading] =
    useState(true);


  const [error, setError] =
    useState("");

  const [adminNotifications, setAdminNotifications] =
    useState([]);

  const [notificationToast, setNotificationToast] =
    useState(null);

  const [notificationPanelOpen, setNotificationPanelOpen] =
    useState(false);


  const [
    resolvingAlert,
    setResolvingAlert
  ] = useState(false);


  const initialAlertsLoaded =
    useRef(false);


  const knownAlertIds =
    useRef(new Set());

  const initialNotificationsLoaded =
    useRef(false);

  const knownNotificationIds =
    useRef(new Set());


  /* =======================================================
     LOAD DASHBOARD STATISTICS
  ======================================================= */

  const loadDashboard = async () => {

    try {

      const response =
        await axios.get(
          `${API_BASE_URL}/admin/dashboard`
        );


      setStats({
        users:
          response.data.users || 0,

        alerts:
          response.data.alerts || 0,

        active:
          response.data.active || 0,

        resolved:
          response.data.resolved || 0,

        active_monitoring:
          response.data.active_monitoring || 0
      });

    } catch (error) {

      console.error(
        "Dashboard statistics error:",
        error
      );

      throw error;
    }
  };


  /* =======================================================
     LOAD EMERGENCY ALERTS
  ======================================================= */

  const loadAlerts = async () => {

    try {

      const response =
        await axios.get(
          `${API_BASE_URL}/admin/alerts`
        );


      const incomingAlerts =
        response.data.alerts || [];


      setAlerts(incomingAlerts);


      /*
       * First page load:
       * remember existing alerts without
       * showing popup for every old alert.
       */

      if (!initialAlertsLoaded.current) {

        incomingAlerts.forEach(
          (item) => {

            knownAlertIds.current.add(
              item.id
            );

          }
        );


        initialAlertsLoaded.current =
          true;

        return;
      }


      /*
       * New alerts after admin dashboard
       * has already opened.
       */

      const newAlerts =
        incomingAlerts.filter(
          (item) =>
            !knownAlertIds.current.has(
              item.id
            )
        );


      newAlerts.forEach(
        (item) => {

          knownAlertIds.current.add(
            item.id
          );

        }
      );


      if (newAlerts.length > 0) {

        const emergencyAlert =

          newAlerts.find(
            (item) => {

              const type =
                item.alert_type
                  ?.toLowerCase() || "";


              const message =
                item.message
                  ?.toLowerCase() || "";


              return (
                type.includes(
                  "automatic_sos"
                ) ||
                type.includes("sos") ||
                message.includes(
                  "critical"
                )
              );
            }
          ) || newAlerts[0];


        setCriticalPopup(
          emergencyAlert
        );
      }

    } catch (error) {

      console.error(
        "Admin alerts error:",
        error
      );
    }
  };


  /* =======================================================
     LOAD ADMIN JOURNEY NOTIFICATIONS
  ======================================================= */

  const loadAdminNotifications = async () => {

    try {

      const response =
        await axios.get(
          `${API_BASE_URL}/admin/notifications`
        );

      const incomingNotifications =
        response.data.notifications || [];

      setAdminNotifications(
        incomingNotifications
      );


      /*
       * First load:
       * remember old notifications without
       * showing a popup for historical events.
       */
      if (!initialNotificationsLoaded.current) {

        incomingNotifications.forEach(
          (item) => {
            knownNotificationIds.current.add(
              item.id
            );
          }
        );

        initialNotificationsLoaded.current =
          true;

        return;
      }


      const newNotifications =
        incomingNotifications.filter(
          (item) =>
            !knownNotificationIds.current.has(
              item.id
            )
        );


      newNotifications.forEach(
        (item) => {
          knownNotificationIds.current.add(
            item.id
          );
        }
      );


      if (newNotifications.length > 0) {

        setNotificationToast(
          newNotifications[0]
        );
      }

    } catch (error) {

      console.error(
        "Admin notification error:",
        error
      );
    }
  };


  const markNotificationRead = async (
    notificationId
  ) => {

    try {

      await axios.patch(
        `${API_BASE_URL}/admin/notifications/${notificationId}/read`
      );

      setAdminNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id === notificationId
                ? {
                    ...item,
                    is_read: 1
                  }
                : item
          )
      );

    } catch (error) {

      console.error(
        "Unable to mark notification read:",
        error
      );
    }
  };


  useEffect(() => {

    if (!notificationToast) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          markNotificationRead(
            notificationToast.id
          );

          setNotificationToast(null);
        },
        5000
      );

    return () => {
      window.clearTimeout(timer);
    };

  }, [notificationToast]);


  /* =======================================================
     LOAD LIVE JOURNEYS
  ======================================================= */

  const loadLiveMonitoring =
    async () => {

      try {

        const response =
          await axios.get(
            `${API_BASE_URL}/admin/live-monitoring`
          );


        const liveJourneys =
          response.data.journeys || [];


        setJourneys(
          liveJourneys
        );


        /*
         * Keep currently selected journey
         * continuously updated.
         */

        setSelectedJourney(
          (currentSelected) => {

            // Keep the main dashboard map focused on ALL live users
            // until the admin manually clicks a marker.
            if (!currentSelected) {
              return null;
            }

            // If the selected user is still active, keep their
            // detail panel updated with the newest live data.
            const updatedJourney =
              liveJourneys.find(
                (journey) =>
                  journey.session_id ===
                  currentSelected.session_id
              );

            // If that journey has ended, close the detail panel and
            // return the map to the all-users view.
            return updatedJourney || null;
          }
        );

      } catch (error) {

        console.error(
          "Live monitoring error:",
          error
        );
      }
    };


  /* =======================================================
     INITIAL LOAD + LIVE POLLING
  ======================================================= */

  useEffect(() => {

    if (!admin?.id) {

      navigate("/admin");

      return;
    }


    const startDashboard =
      async () => {

        try {

          setLoading(true);

          setError("");


          await Promise.all([
            loadDashboard(),
            loadAlerts(),
            loadLiveMonitoring(),
            loadAdminNotifications()
          ]);

        } catch (error) {

          setError(
            error.response?.data?.detail ||
            "Unable to load NightGuard admin dashboard."
          );

        } finally {

          setLoading(false);
        }
      };


    startDashboard();


    /*
     * Real-time polling.
     *
     * Every 5 seconds:
     * - dashboard totals
     * - live GPS
     * - AI risk
     * - emergency alerts
     */

    const interval =
      setInterval(
        () => {

          loadDashboard();

          loadAlerts();

          loadLiveMonitoring();

          loadAdminNotifications();

        },
        5000
      );


    return () => {

      clearInterval(interval);

    };

  }, [admin?.id, navigate]);


  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = () => {

    localStorage.removeItem(
      "admin"
    );

    navigate("/admin");
  };


  /* =======================================================
     ALERT FILTERS
  ======================================================= */

  const activeAlerts =
    alerts.filter(
      (alert) =>
        alert.status
          ?.toLowerCase() ===
        "active"
    );


  const latestAlerts =
    alerts.slice(0, 5);

  const unreadJourneyNotifications =
    adminNotifications.filter(
      (item) => !item.is_read
    );


  /* =======================================================
     RISK COUNTS
  ======================================================= */

  const riskCounts =
    useMemo(
      () => {

        const counts = {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        };


        journeys.forEach(
          (journey) => {

            const level =
              journey.risk_level
                ?.toLowerCase() ||
              "low";


            if (
              Object.prototype.hasOwnProperty.call(
                counts,
                level
              )
            ) {

              counts[level] += 1;
            }
          }
        );


        return counts;
      },
      [journeys]
    );


  /* =======================================================
     FORMAT DATE
  ======================================================= */

  const formatDate =
    (value) => {

      if (!value) {

        return "Not available";
      }


      return new Date(
        value
      ).toLocaleString();
    };


  /* =======================================================
     FORMAT STATIONARY TIME
  ======================================================= */

  const formatStationaryTime =
    (seconds) => {

      const totalSeconds =
        Number(seconds || 0);


      const minutes =
        Math.floor(
          totalSeconds / 60
        );


      const remainingSeconds =
        totalSeconds % 60;


      return (
        `${String(minutes).padStart(
          2,
          "0"
        )}:` +
        `${String(
          remainingSeconds
        ).padStart(2, "0")}`
      );
    };


  /* =======================================================
     RISK CSS CLASS
  ======================================================= */

  const getRiskClass =
    (riskLevel) => {

      const level =
        riskLevel
          ?.toLowerCase() ||
        "low";


      if (
        level === "critical"
      ) {

        return "risk-critical";
      }


      if (level === "high") {

        return "risk-high";
      }


      if (level === "medium") {

        return "risk-medium";
      }


      return "risk-low";
    };


  /* =======================================================
     MAP ICON
  ======================================================= */

  const createJourneyMarker =
    (journey) => {

      const riskClass =
        getRiskClass(
          journey.risk_level
        );


      return L.divIcon({
        className:
          "admin-live-marker-wrapper",

        html: `
          <div class="admin-live-marker ${riskClass}">
            <div class="admin-live-marker-pulse"></div>
            <div class="admin-live-marker-center"></div>
          </div>
        `,

        iconSize: [40, 40],

        iconAnchor: [20, 20],

        popupAnchor: [0, -20]
      });
    };


  /* =======================================================
     EMAIL USER
  ======================================================= */

  const emailUser =
    (journey) => {

      if (!journey?.email) {

        alert(
          "User email is not available."
        );

        return;
      }


      const subject =
        encodeURIComponent(
          "NightGuard Safety Check"
        );


      const body =
        encodeURIComponent(
          `Hello ${journey.full_name || "NightGuard user"},

NightGuard has detected increased risk during your active journey.

Current risk level: ${journey.risk_level || "Unknown"}
Risk score: ${journey.risk_score ?? "Unknown"}
Destination: ${journey.destination || "Not available"}

Please reply to confirm that you are safe.

NightGuard Admin`
        );


      window.location.href =
        `mailto:${journey.email}` +
        `?subject=${subject}` +
        `&body=${body}`;
    };


  /* =======================================================
     OPEN LOCATION
  ======================================================= */

  const openLocation =
    (journey) => {

      if (
        journey?.latitude === null ||
        journey?.longitude === null ||
        journey?.latitude === undefined ||
        journey?.longitude === undefined
      ) {

        alert(
          "Live location is not currently available."
        );

        return;
      }


      window.open(
        `https://www.openstreetmap.org/?mlat=${journey.latitude}&mlon=${journey.longitude}#map=17/${journey.latitude}/${journey.longitude}`,
        "_blank"
      );
    };


  /* =======================================================
     RESOLVE ACTIVE ALERT
  ======================================================= */

  const resolveCurrentAlert =
    async () => {

      const alertId =
        selectedJourney
          ?.active_alert
          ?.id;


      if (!alertId) {

        alert(
          "There is no active emergency alert for this journey."
        );

        return;
      }


      try {

        setResolvingAlert(true);


        await axios.put(
          `${API_BASE_URL}/admin/alerts/${alertId}`,
          null,
          {
            params: {
              status: "Resolved"
            }
          }
        );


        await Promise.all([
          loadDashboard(),
          loadAlerts(),
          loadLiveMonitoring()
        ]);


        alert(
          "Emergency alert marked as resolved."
        );

      } catch (error) {

        console.error(error);


        alert(
          error.response?.data?.detail ||
          "Unable to resolve emergency alert."
        );

      } finally {

        setResolvingAlert(false);
      }
    };


  /* =======================================================
     DEFAULT MAP POSITION
  ======================================================= */

  const defaultMapPosition = [
    51.8787,
    -0.42
  ];


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="admin-control-panel">


      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`admin-sidebar ${
          sidebarOpen
            ? "admin-sidebar-open"
            : ""
        }`}
      >

        <div className="admin-sidebar-brand">

          <div className="admin-brand-icon">
            🌙
          </div>


          <div>

            <h2>
              NightGuard
            </h2>

            <span>
              ADMIN
            </span>

          </div>

        </div>


        <nav className="admin-sidebar-nav">


          <button className="active">

            <span>▦</span>

            Dashboard

          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/live-monitoring"
              )
            }
          >

            <span>⌖</span>

            Live Monitoring

            {journeys.length > 0 && (
              <span className="sidebar-live-count">
                {journeys.length}
              </span>
            )}

          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/alerts"
              )
            }
          >

            <span>🚨</span>

            Alerts

            {activeAlerts.length > 0 && (
              <span className="sidebar-alert-count">
                {activeAlerts.length}
              </span>
            )}

          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/users"
              )
            }
          >

            <span>👥</span>

            Users

          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/contacts"
              )
            }
          >

            <span>☎</span>

            Trusted Contacts

          </button>


          <button
  onClick={() =>
    navigate("/admin/reports")
  }
>
  <span>▤</span>
  Reports
</button>


<button
  onClick={() =>
    navigate("/admin/analytics")
  }
>
  <span>▥</span>
  Analytics
</button>


<button
  onClick={() =>
    navigate("/admin/settings")
  }
>
  <span>⚙</span>
  Settings
</button>


        </nav>


        <div className="admin-sidebar-bottom">

          <button onClick={logout}>

            <span>↪</span>

            Logout

          </button>

        </div>

      </aside>


      {sidebarOpen && (

        <div
          className="admin-sidebar-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />

      )}


      {/* ===================================================
          MAIN
      =================================================== */}

      <div className="admin-main-area">


        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="admin-topbar">


          <div className="admin-topbar-left">


            <button
              className="admin-mobile-menu"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              ☰
            </button>


            <div>

              <h1>
                Admin Dashboard
              </h1>

              <p>
                Real-time NightGuard safety monitoring
              </p>

            </div>


          </div>


          <div className="admin-topbar-right">


            <div
              style={{
                position: "relative"
              }}
            >
              <button
                className="admin-notification-button"
                onClick={() =>
                  setNotificationPanelOpen(
                    (current) => !current
                  )
                }
              >

                🔔

                {(activeAlerts.length +
                  unreadJourneyNotifications.length) > 0 && (

                  <span>
                    {activeAlerts.length +
                      unreadJourneyNotifications.length}
                  </span>

                )}

              </button>


              {notificationPanelOpen && (

                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "52px",
                    width: "360px",
                    maxHeight: "430px",
                    overflowY: "auto",
                    background: "#120b12",
                    border: "1px solid rgba(236,72,153,.35)",
                    borderRadius: "14px",
                    boxShadow: "0 18px 45px rgba(0,0,0,.45)",
                    zIndex: 9999,
                    padding: "14px"
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px"
                    }}
                  >
                    <strong>
                      Notifications
                    </strong>

                    <button
                      type="button"
                      onClick={() => {
                        setNotificationPanelOpen(false);
                        navigate("/admin/alerts");
                      }}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "#f9a8d4",
                        cursor: "pointer"
                      }}
                    >
                      Alerts →
                    </button>
                  </div>


                  {adminNotifications.length === 0 ? (

                    <div
                      style={{
                        color: "#9ca3af",
                        padding: "20px 8px",
                        textAlign: "center"
                      }}
                    >
                      No journey notifications yet.
                    </div>

                  ) : (

                    adminNotifications
                      .slice(0, 10)
                      .map(
                        (item) => (

                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              markNotificationRead(item.id);
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              border: 0,
                              borderBottom:
                                "1px solid rgba(255,255,255,.07)",
                              background:
                                item.is_read
                                  ? "transparent"
                                  : "rgba(236,72,153,.08)",
                              color: "white",
                              padding: "12px",
                              cursor: "pointer",
                              borderRadius: "8px"
                            }}
                          >

                            <strong
                              style={{
                                display: "block",
                                color:
                                  item.notification_type ===
                                  "JOURNEY_COMPLETED"
                                    ? "#86efac"
                                    : item.notification_type ===
                                      "JOURNEY_CANCELLED"
                                      ? "#fbbf24"
                                      : item.notification_type ===
                                        "JOURNEY_INTERRUPTED"
                                        ? "#fb923c"
                                        : "#f9a8d4"
                              }}
                            >
                              {item.notification_type ===
                              "JOURNEY_STARTED"
                                ? "🚶 "
                                : item.notification_type ===
                                  "JOURNEY_COMPLETED"
                                  ? "✅ "
                                  : item.notification_type ===
                                    "JOURNEY_CANCELLED"
                                    ? "❌ "
                                    : "⚠️ "}
                              {item.title}
                            </strong>

                            <span
                              style={{
                                display: "block",
                                marginTop: "5px",
                                color: "#e5e7eb",
                                fontSize: "12px",
                                lineHeight: 1.5
                              }}
                            >
                              {item.message}
                            </span>

                            <small
                              style={{
                                display: "block",
                                marginTop: "5px",
                                color: "#9ca3af"
                              }}
                            >
                              {formatDate(item.created_at)}
                            </small>

                          </button>

                        )
                      )

                  )}

                </div>

              )}

            </div>


            <div className="admin-profile">

              <div className="admin-avatar">
                👤
              </div>


              <div>

                <strong>
                  {admin?.full_name ||
                    "NightGuard Admin"}
                </strong>

                <span>
                  Administrator
                </span>

              </div>

            </div>


          </div>


        </header>


        {/* =================================================
            DASHBOARD CONTENT
        ================================================= */}

        <main className="admin-dashboard-content">


          {loading && (

            <div className="admin-dashboard-loading">

              Loading NightGuard live monitoring...

            </div>

          )}


          {!loading && error && (

            <div className="admin-dashboard-error">

              {error}

            </div>

          )}


          {!loading && (

            <>


              {/* ===========================================
                  SUMMARY CARDS
              =========================================== */}

              <section className="admin-overview-grid">


                <div className="overview-card">

                  <div className="overview-icon">
                    👥
                  </div>

                  <div>

                    <span>
                      Total Users
                    </span>

                    <strong>
                      {stats.users}
                    </strong>

                    <small>
                      Registered users
                    </small>

                  </div>

                </div>


                <div className="overview-card">

                  <div className="overview-icon">
                    📍
                  </div>

                  <div>

                    <span>
                      Active Monitoring
                    </span>

                    <strong className="live-number">
                      {stats.active_monitoring}
                    </strong>

                    <small>
                      Live now
                    </small>

                  </div>

                </div>


                <div className="overview-card">

                  <div className="overview-icon">
                    🚨
                  </div>

                  <div>

                    <span>
                      Active Alerts
                    </span>

                    <strong>
                      {stats.active}
                    </strong>

                    <small>
                      Need attention
                    </small>

                  </div>

                </div>


                <div className="overview-card">

                  <div className="overview-icon">
                    🔔
                  </div>

                  <div>

                    <span>
                      Total Alerts
                    </span>

                    <strong>
                      {stats.alerts}
                    </strong>

                    <small>
                      All incidents
                    </small>

                  </div>

                </div>


                <div className="overview-card">

                  <div className="overview-icon">
                    ✅
                  </div>

                  <div>

                    <span>
                      Resolved
                    </span>

                    <strong>
                      {stats.resolved}
                    </strong>

                    <small>
                      Handled alerts
                    </small>

                  </div>

                </div>


              </section>


              {/* ===========================================
                  LIVE MONITORING + LATEST ALERTS
              =========================================== */}

              <section className="admin-live-layout">


                {/* =========================================
                    REAL LIVE MAP
                ========================================= */}

                <div className="admin-dashboard-panel admin-live-panel">


                  <div className="admin-panel-heading">

                    <div>

                      <span className="panel-label">
                        REAL-TIME MONITORING
                      </span>

                      <h2>
                        Live Active Users
                      </h2>

                    </div>


                    <div
                      className="live-map-count"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                    >

                      <span className="live-pulse-dot"></span>

                      {journeys.length} LIVE

                      {selectedJourney && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedJourney(null)
                          }
                          style={{
                            border: "1px solid #ec4899",
                            background: "transparent",
                            color: "#f9a8d4",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "700"
                          }}
                        >
                          Show All Users
                        </button>
                      )}

                    </div>

                  </div>


                  <div className="admin-real-map">


                    <MapContainer
                      center={
                        selectedJourney?.latitude &&
                        selectedJourney?.longitude
                          ? [
                              Number(
                                selectedJourney.latitude
                              ),
                              Number(
                                selectedJourney.longitude
                              )
                            ]
                          : defaultMapPosition
                      }
                      zoom={15}
                      scrollWheelZoom={true}
                      className="admin-leaflet-map"
                    >


                      <TileLayer
                        attribution="© OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />


                      {journeys.map(
                        (journey) => {


                          if (
                            journey.latitude === null ||
                            journey.longitude === null ||
                            journey.latitude === undefined ||
                            journey.longitude === undefined
                          ) {

                            return null;
                          }


                          return (

                            <Marker
                              key={
                                journey.session_id
                              }
                              position={[
                                Number(
                                  journey.latitude
                                ),
                                Number(
                                  journey.longitude
                                )
                              ]}
                              icon={
                                createJourneyMarker(
                                  journey
                                )
                              }
                              eventHandlers={{
                                click: () =>
                                  setSelectedJourney(
                                    journey
                                  )
                              }}
                            >

                              <Popup>

                                <div className="admin-map-popup">

                                  <strong>
                                    {
                                      journey.full_name
                                    }
                                  </strong>

                                  <span
                                    className={`map-popup-risk ${getRiskClass(
                                      journey.risk_level
                                    )}`}
                                  >
                                    {
                                      journey.risk_level
                                    }
                                  </span>

                                  <p>
                                    Risk Score:{" "}
                                    <b>
                                      {
                                        journey.risk_score
                                      }
                                    </b>
                                  </p>

                                  <p>
                                    Speed:{" "}
                                    {
                                      Number(
                                        journey.speed || 0
                                      ).toFixed(2)
                                    }{" "}
                                    m/s
                                  </p>

                                  <button
                                    onClick={() =>
                                      setSelectedJourney(
                                        journey
                                      )
                                    }
                                  >
                                    View Details
                                  </button>

                                </div>

                              </Popup>

                            </Marker>

                          );

                        }
                      )}


                      <AdminMapController
                        journeys={journeys}
                        selectedJourney={
                          selectedJourney
                        }
                      />


                    </MapContainer>


                    {journeys.length === 0 && (

                      <div className="admin-no-live-overlay">

                        <div>
                          📍
                        </div>

                        <strong>
                          No Active Journeys
                        </strong>

                        <span>
                          Live users will appear here automatically.
                        </span>

                      </div>

                    )}


                  </div>


                  <div className="admin-risk-legend">

                    <span>
                      <i className="legend-low"></i>
                      Low
                    </span>

                    <span>
                      <i className="legend-medium"></i>
                      Medium
                    </span>

                    <span>
                      <i className="legend-high"></i>
                      High
                    </span>

                    <span>
                      <i className="legend-critical"></i>
                      Critical
                    </span>

                  </div>


                </div>


                {/* =========================================
                    LATEST ALERTS
                ========================================= */}

                <div className="admin-dashboard-panel admin-latest-panel">


                  <div className="admin-panel-heading">


                    <div>

                      <span className="panel-label">
                        ALERTS
                      </span>

                      <h2>
                        Latest Alerts
                      </h2>

                    </div>


                    {activeAlerts.length > 0 && (

                      <span className="active-alert-pill">

                        {
                          activeAlerts.length
                        }{" "}
                        ACTIVE

                      </span>

                    )}


                  </div>


                  <div className="admin-latest-alert-list">


                    {latestAlerts.length === 0 && (

                      <div className="admin-no-alerts">

                        ✅ No emergency alerts

                      </div>

                    )}


                    {latestAlerts.map(
                      (item) => (

                        <button
                          key={item.id}
                          className={`admin-latest-alert ${
                            item.status
                              ?.toLowerCase() ===
                            "active"
                              ? "alert-is-active"
                              : ""
                          }`}
                          onClick={() => {

                            const relatedJourney =
                              journeys.find(
                                (journey) =>
                                  journey.user_id ===
                                  item.user_id
                              );


                            if (
                              relatedJourney
                            ) {

                              setSelectedJourney(
                                relatedJourney
                              );

                            } else {

                              navigate(
                                "/admin/alerts"
                              );
                            }

                          }}
                        >

                          <div className="latest-alert-symbol">

                            🚨

                          </div>


                          <div>

                            <strong>
                              {
                                item.full_name
                              }
                            </strong>

                            <span>
                              {
                                item.alert_type
                              }
                            </span>

                            <small>
                              {
                                formatDate(
                                  item.created_at
                                )
                              }
                            </small>

                          </div>


                          <span
                            className={`latest-alert-status ${
                              item.status
                                ?.toLowerCase() ===
                              "active"
                                ? "active"
                                : "resolved"
                            }`}
                          >
                            {
                              item.status
                            }
                          </span>


                        </button>

                      )
                    )}


                  </div>


                  <button
                    className="view-all-alerts-button"
                    onClick={() =>
                      navigate(
                        "/admin/alerts"
                      )
                    }
                  >

                    View All Alerts →

                  </button>


                </div>


              </section>


              {/* ===========================================
                  SELECTED ACTIVE USER
              =========================================== */}

              {selectedJourney && (

                <section className="admin-incident-panel">


                  <div className="incident-panel-heading">


                    <div>

                      <span className="panel-label">
                        ALERT DETAILS & ACTION PANEL
                      </span>


                      <div className="incident-user-title">

                        <div className="incident-user-avatar">
                          👤
                        </div>


                        <div>

                          <h2>
                            {
                              selectedJourney.full_name
                            }
                          </h2>

                          <span>
                            Session #
                            {
                              selectedJourney.session_id
                            }
                          </span>

                        </div>


                        <span
                          className={`incident-risk-badge ${getRiskClass(
                            selectedJourney.risk_level
                          )}`}
                        >

                          {
                            selectedJourney.risk_level
                          }{" "}
                          RISK

                        </span>


                      </div>

                    </div>


                    <span className="incident-live-badge">

                      ● LIVE

                    </span>


                  </div>


                  <div className="incident-content-grid">


                    {/* =====================================
                        CURRENT LOCATION
                    ===================================== */}

                    <div className="incident-location-column">


                      <h3>
                        Current Location
                      </h3>


                      <div className="incident-mini-map">


                        <MapContainer
                          center={[
                            Number(
                              selectedJourney.latitude ||
                                defaultMapPosition[0]
                            ),
                            Number(
                              selectedJourney.longitude ||
                                defaultMapPosition[1]
                            )
                          ]}
                          zoom={16}
                          scrollWheelZoom={false}
                          className="incident-leaflet-map"
                        >

                          <TileLayer
                            attribution="© OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />


                          {selectedJourney.latitude !== null &&
                            selectedJourney.longitude !== null && (

                              <Marker
                                position={[
                                  Number(
                                    selectedJourney.latitude
                                  ),
                                  Number(
                                    selectedJourney.longitude
                                  )
                                ]}
                                icon={
                                  createJourneyMarker(
                                    selectedJourney
                                  )
                                }
                              />

                            )}

                        </MapContainer>

                      </div>


                      <div className="incident-location-text">

                        <strong>
                          📍 Live GPS
                        </strong>

                        <span>
                          {
                            selectedJourney.latitude
                          }
                          ,{" "}
                          {
                            selectedJourney.longitude
                          }
                        </span>

                        <small>
                          Last update:{" "}
                          {
                            formatDate(
                              selectedJourney.location_updated_at
                            )
                          }
                        </small>

                      </div>


                    </div>


                    {/* =====================================
                        RISK SUMMARY
                    ===================================== */}

                    <div className="incident-risk-summary">


                      <h3>
                        Risk Summary
                      </h3>


                      <div className="risk-summary-row">

                        <span>
                          Risk Score
                        </span>

                        <strong
                          className={getRiskClass(
                            selectedJourney.risk_level
                          )}
                        >
                          {
                            selectedJourney.risk_score
                          }{" "}
                          / 100
                        </strong>

                      </div>


                      <div className="risk-summary-row">

                        <span>
                          Status
                        </span>

                        <strong
                          className={getRiskClass(
                            selectedJourney.risk_level
                          )}
                        >
                          {
                            selectedJourney.risk_level
                          }
                        </strong>

                      </div>


                      <div className="risk-summary-row">

                        <span>
                          Speed
                        </span>

                        <strong>

                          {
                            Number(
                              selectedJourney.speed ||
                                0
                            ).toFixed(2)
                          }{" "}
                          m/s

                        </strong>

                      </div>


                      <div className="risk-summary-row">

                        <span>
                          Stationary Time
                        </span>

                        <strong>

                          {
                            formatStationaryTime(
                              selectedJourney.stationary_duration
                            )
                          }

                        </strong>

                      </div>


                      <div className="risk-summary-row">

                        <span>
                          Journey Status
                        </span>

                        <strong>
                          {
                            selectedJourney.status
                          }
                        </strong>

                      </div>


                      <div className="risk-summary-row">

                        <span>
                          Emergency Alert
                        </span>

                        <strong
                          className={
                            selectedJourney.active_alert
                              ? "danger-value"
                              : "safe-value"
                          }
                        >

                          {
                            selectedJourney.active_alert
                              ? "ACTIVE"
                              : "None"
                          }

                        </strong>

                      </div>


                      <div className="risk-reason-box">

                        <span>
                          AI Risk Reason
                        </span>

                        <p>
                          {
                            selectedJourney.risk_reason ||
                            "Monitoring active"
                          }
                        </p>

                      </div>


                      <div className="destination-box">

                        <span>
                          Destination
                        </span>

                        <p>
                          {
                            selectedJourney.destination
                          }
                        </p>

                      </div>


                    </div>


                    {/* =====================================
                        ACTIONS
                    ===================================== */}

                    <div className="incident-actions-column">


                      <h3>
                        Actions
                      </h3>


                      <button
                        className="incident-email-button"
                        onClick={() =>
                          emailUser(
                            selectedJourney
                          )
                        }
                      >

                        📧 Email User

                      </button>


                      <button
                        className="incident-call-button"
                        disabled
                      >

                        📞 Call User
                        <small>
                          Coming Soon
                        </small>

                      </button>


                      <button
                        className="incident-location-button"
                        onClick={() =>
                          openLocation(
                            selectedJourney
                          )
                        }
                      >

                        📍 View Location

                      </button>


                      <button
                        className="incident-alert-button"
                        onClick={() =>
                          navigate(
                            "/admin/alerts"
                          )
                        }
                      >

                        🚨 View All Alerts

                      </button>


                      {selectedJourney
                        .active_alert && (

                        <button
                          className="incident-resolve-button"
                          disabled={
                            resolvingAlert
                          }
                          onClick={
                            resolveCurrentAlert
                          }
                        >

                          {resolvingAlert
                            ? "Resolving..."
                            : "✅ Mark as Resolved"}

                        </button>

                      )}


                    </div>


                    {/* =====================================
                        TRUSTED CONTACTS
                    ===================================== */}

                    <div className="incident-trusted-contacts">


                      <div className="trusted-heading">

                        <h3>
                          Trusted Contacts
                        </h3>

                        <span>
                          {
                            selectedJourney
                              .trusted_contacts
                              ?.length || 0
                          }
                        </span>

                      </div>


                      {!selectedJourney
                        .trusted_contacts ||
                      selectedJourney
                        .trusted_contacts
                        .length === 0 ? (

                        <div className="no-trusted-contacts">

                          No trusted contacts registered.

                        </div>

                      ) : (

                        <div className="trusted-contact-list">


                          {selectedJourney
                            .trusted_contacts
                            .map(
                              (contact) => (

                                <div
                                  key={
                                    contact.id
                                  }
                                  className="trusted-contact-row"
                                >

                                  <div className="trusted-contact-avatar">

                                    👤

                                  </div>


                                  <div>

                                    <strong>
                                      {
                                        contact.contact_name
                                      }
                                    </strong>

                                    <span>
                                      {
                                        contact.relationship
                                      }
                                    </span>

                                    <small>
                                      {
                                        contact.contact_phone
                                      }
                                    </small>

                                  </div>


                                  <button
                                    disabled
                                    title="Calling will be added later"
                                  >

                                    📞

                                  </button>


                                </div>

                              )
                            )}


                        </div>

                      )}


                      <button
                        className="manage-trusted-button"
                        onClick={() =>
                          navigate(
                            "/admin/contacts"
                          )
                        }
                      >

                        View All Trusted Contacts →

                      </button>


                    </div>


                  </div>


                </section>

              )}


              {/* ===========================================
                  RISK OVERVIEW
              =========================================== */}

              <section className="admin-risk-overview">


                <div>

                  <span>
                    🟢 Low Risk
                  </span>

                  <strong>
                    {
                      riskCounts.low
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    🟡 Medium Risk
                  </span>

                  <strong>
                    {
                      riskCounts.medium
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    🟠 High Risk
                  </span>

                  <strong>
                    {
                      riskCounts.high
                    }
                  </strong>

                </div>


                <div>

                  <span>
                    🔴 Critical
                  </span>

                  <strong>
                    {
                      riskCounts.critical
                    }
                  </strong>

                </div>


              </section>


            </>

          )}


        </main>


      </div>


      {/* ===================================================
          JOURNEY LIFECYCLE NOTIFICATION TOAST
      =================================================== */}

      {notificationToast && (

        <div
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 10000,
            width: "360px",
            maxWidth: "calc(100vw - 48px)",
            padding: "18px",
            borderRadius: "14px",
            background:
              notificationToast.notification_type ===
              "JOURNEY_COMPLETED"
                ? "linear-gradient(135deg,#14532d,#166534)"
                : notificationToast.notification_type ===
                  "JOURNEY_CANCELLED"
                  ? "linear-gradient(135deg,#78350f,#92400e)"
                  : notificationToast.notification_type ===
                    "JOURNEY_INTERRUPTED"
                    ? "linear-gradient(135deg,#7c2d12,#9a3412)"
                    : "linear-gradient(135deg,#831843,#be185d)",
            color: "white",
            boxShadow:
              "0 18px 45px rgba(0,0,0,.45)",
            border:
              "1px solid rgba(255,255,255,.14)"
          }}
        >

          <strong
            style={{
              display: "block",
              fontSize: "16px",
              marginBottom: "7px"
            }}
          >
            {notificationToast.notification_type ===
            "JOURNEY_STARTED"
              ? "🚶 "
              : notificationToast.notification_type ===
                "JOURNEY_COMPLETED"
                ? "✅ "
                : notificationToast.notification_type ===
                  "JOURNEY_CANCELLED"
                  ? "❌ "
                  : "⚠️ "}
            {notificationToast.title}
          </strong>

          <p
            style={{
              margin: 0,
              lineHeight: 1.55,
              fontSize: "13px"
            }}
          >
            {notificationToast.message}
          </p>

          <small
            style={{
              display: "block",
              marginTop: "8px",
              opacity: .8
            }}
          >
            {formatDate(
              notificationToast.created_at
            )}
          </small>

          <button
            type="button"
            onClick={() => {
              markNotificationRead(
                notificationToast.id
              );

              setNotificationToast(null);
            }}
            style={{
              marginTop: "12px",
              border: "1px solid rgba(255,255,255,.35)",
              background: "rgba(255,255,255,.08)",
              color: "white",
              borderRadius: "8px",
              padding: "7px 12px",
              cursor: "pointer"
            }}
          >
            Dismiss
          </button>

        </div>

      )}


      {/* ===================================================
          CRITICAL POPUP
      =================================================== */}

      {criticalPopup && (

        <div className="critical-alert-overlay">


          <div className="critical-alert-popup">


            <div className="critical-popup-icon">

              🚨

            </div>


            <span className="critical-popup-label">

              CRITICAL SAFETY ALERT

            </span>


            <h2>

              Emergency Alert Received

            </h2>


            <p className="critical-popup-user">

              {
                criticalPopup.full_name ||
                "NightGuard User"
              }

            </p>


            <div className="critical-popup-details">


              <div>

                <span>
                  Alert Type
                </span>

                <strong>
                  {
                    criticalPopup.alert_type
                  }
                </strong>

              </div>


              <div>

                <span>
                  Status
                </span>

                <strong className="critical-text">

                  {
                    criticalPopup.status
                  }

                </strong>

              </div>


              <div className="critical-location">

                <span>
                  Current Location
                </span>

                <strong>

                  {
                    criticalPopup.location ||
                    "Location unavailable"
                  }

                </strong>

              </div>


            </div>


            <div className="critical-message">

              {
                criticalPopup.message ||
                "A critical NightGuard safety event has been detected."
              }

            </div>


            <div className="critical-popup-actions">


              <button
                className="acknowledge-button"
                onClick={() =>
                  setCriticalPopup(null)
                }
              >

                Acknowledge

              </button>


              <button
                className="view-emergency-button"
                onClick={() => {

                  const relatedJourney =
                    journeys.find(
                      (journey) =>
                        journey.user_id ===
                        criticalPopup.user_id
                    );


                  if (relatedJourney) {

                    setSelectedJourney(
                      relatedJourney
                    );

                    setCriticalPopup(null);

                  } else {

                    setCriticalPopup(null);

                    navigate(
                      "/admin/alerts"
                    );
                  }

                }}
              >

                View Emergency

              </button>


            </div>


          </div>


        </div>

      )}


    </div>
  );
}


export default AdminDashboard;