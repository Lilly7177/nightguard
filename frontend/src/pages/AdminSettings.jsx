import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import "../styles/AdminSettings.css";


function AdminSettings() {
  const navigate = useNavigate();

  const [admin, setAdmin] =
    useState(null);

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const [emailAlertsEnabled, setEmailAlertsEnabled] =
    useState(true);

  const [criticalPopupEnabled, setCriticalPopupEnabled] =
    useState(true);

  const [liveRefreshEnabled, setLiveRefreshEnabled] =
    useState(true);

  const [refreshSeconds, setRefreshSeconds] =
    useState(5);

  const [defaultRiskView, setDefaultRiskView] =
    useState("All");

  const [message, setMessage] =
    useState("");


  useEffect(() => {
    try {
      const savedAdmin =
        localStorage.getItem("admin");

      const parsedAdmin =
        savedAdmin
          ? JSON.parse(savedAdmin)
          : null;

      setAdmin(parsedAdmin);

      const savedSettings =
        localStorage.getItem(
          "nightguard_admin_settings"
        );

      if (savedSettings) {
        const settings =
          JSON.parse(savedSettings);

        setNotificationsEnabled(
          settings.notificationsEnabled ??
          true
        );

        setEmailAlertsEnabled(
          settings.emailAlertsEnabled ??
          true
        );

        setCriticalPopupEnabled(
          settings.criticalPopupEnabled ??
          true
        );

        setLiveRefreshEnabled(
          settings.liveRefreshEnabled ??
          true
        );

        setRefreshSeconds(
          settings.refreshSeconds ??
          5
        );

        setDefaultRiskView(
          settings.defaultRiskView ??
          "All"
        );
      }

    } catch (error) {
      console.error(
        "Unable to load admin settings:",
        error
      );
    }
  }, []);


  const saveSettings = () => {
    const settings = {
      notificationsEnabled,
      emailAlertsEnabled,
      criticalPopupEnabled,
      liveRefreshEnabled,
      refreshSeconds:
        Number(refreshSeconds),
      defaultRiskView
    };

    localStorage.setItem(
      "nightguard_admin_settings",
      JSON.stringify(settings)
    );

    setMessage(
      "Admin settings saved successfully."
    );

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  };


  const resetSettings = () => {
    const confirmed =
      window.confirm(
        "Reset admin settings to default values?"
      );

    if (!confirmed) {
      return;
    }

    setNotificationsEnabled(true);
    setEmailAlertsEnabled(true);
    setCriticalPopupEnabled(true);
    setLiveRefreshEnabled(true);
    setRefreshSeconds(5);
    setDefaultRiskView("All");

    localStorage.removeItem(
      "nightguard_admin_settings"
    );

    setMessage(
      "Settings reset to defaults."
    );

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  };


  return (
    <div className="admin-settings-page">

      <aside className="admin-settings-sidebar">

        <div className="admin-settings-brand">

          <div className="settings-brand-icon">
            🌙
          </div>

          <div>
            <h2>NightGuard</h2>
            <span>ADMIN</span>
          </div>

        </div>


        <nav>

          <button
            onClick={() =>
              navigate(
                "/admin/dashboard"
              )
            }
          >
            ▦ Dashboard
          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/live-monitoring"
              )
            }
          >
            ⌖ Live Monitoring
          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/alerts"
              )
            }
          >
            🚨 Alerts
          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/users"
              )
            }
          >
            👥 Users
          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/contacts"
              )
            }
          >
            ☎ Trusted Contacts
          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/reports"
              )
            }
          >
            ▤ Reports
          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/analytics"
              )
            }
          >
            ▥ Analytics
          </button>


          <button
            onClick={() =>
              navigate(
                "/admin/statistics"
              )
            }
          >
            📊 Statistics
          </button>


          <button
            className="active"
          >
            ⚙ Settings
          </button>

        </nav>

      </aside>


      <main className="admin-settings-main">

        <section className="admin-settings-heading">

          <span>
            SYSTEM CONFIGURATION
          </span>

          <h1>
            ⚙ Admin Settings
          </h1>

          <p>
            Configure NightGuard admin
            dashboard preferences and
            emergency monitoring options.
          </p>

        </section>


        <section className="settings-profile-card">

          <div className="settings-profile-avatar">
            👤
          </div>

          <div>

            <span>
              Administrator
            </span>

            <h2>
              {
                admin?.full_name ||
                "NightGuard Admin"
              }
            </h2>

            <p>
              {
                admin?.email ||
                "Admin account"
              }
            </p>

          </div>

        </section>


        <div className="admin-settings-grid">


          <section className="settings-panel">

            <div className="settings-panel-title">

              <span>
                🔔
              </span>

              <div>
                <h2>
                  Alert Notifications
                </h2>

                <p>
                  Control how emergency
                  activity is shown.
                </p>
              </div>

            </div>


            <div className="settings-row">

              <div>
                <strong>
                  Dashboard Notifications
                </strong>

                <p>
                  Show new emergency
                  notifications to admins.
                </p>
              </div>

              <label className="settings-switch">

                <input
                  type="checkbox"
                  checked={
                    notificationsEnabled
                  }
                  onChange={(event) =>
                    setNotificationsEnabled(
                      event.target.checked
                    )
                  }
                />

                <span></span>

              </label>

            </div>


            <div className="settings-row">

              <div>
                <strong>
                  Critical Alert Popup
                </strong>

                <p>
                  Show emergency popup when a
                  new critical SOS is received.
                </p>
              </div>

              <label className="settings-switch">

                <input
                  type="checkbox"
                  checked={
                    criticalPopupEnabled
                  }
                  onChange={(event) =>
                    setCriticalPopupEnabled(
                      event.target.checked
                    )
                  }
                />

                <span></span>

              </label>

            </div>


            <div className="settings-row">

              <div>
                <strong>
                  Trusted Contact Email Alerts
                </strong>

                <p>
                  Allow emergency email
                  notifications to trusted
                  contacts.
                </p>
              </div>

              <label className="settings-switch">

                <input
                  type="checkbox"
                  checked={
                    emailAlertsEnabled
                  }
                  onChange={(event) =>
                    setEmailAlertsEnabled(
                      event.target.checked
                    )
                  }
                />

                <span></span>

              </label>

            </div>

          </section>


          <section className="settings-panel">

            <div className="settings-panel-title">

              <span>
                📡
              </span>

              <div>

                <h2>
                  Live Monitoring
                </h2>

                <p>
                  Configure live dashboard
                  behaviour.
                </p>

              </div>

            </div>


            <div className="settings-row">

              <div>
                <strong>
                  Automatic Refresh
                </strong>

                <p>
                  Refresh live users, alerts
                  and risk data automatically.
                </p>
              </div>

              <label className="settings-switch">

                <input
                  type="checkbox"
                  checked={
                    liveRefreshEnabled
                  }
                  onChange={(event) =>
                    setLiveRefreshEnabled(
                      event.target.checked
                    )
                  }
                />

                <span></span>

              </label>

            </div>


            <div className="settings-field">

              <label>
                Refresh Interval
              </label>

              <select
                value={refreshSeconds}
                onChange={(event) =>
                  setRefreshSeconds(
                    Number(
                      event.target.value
                    )
                  )
                }
                disabled={
                  !liveRefreshEnabled
                }
              >

                <option value={3}>
                  Every 3 seconds
                </option>

                <option value={5}>
                  Every 5 seconds
                </option>

                <option value={10}>
                  Every 10 seconds
                </option>

                <option value={30}>
                  Every 30 seconds
                </option>

              </select>

            </div>


            <div className="settings-field">

              <label>
                Default Risk Filter
              </label>

              <select
                value={defaultRiskView}
                onChange={(event) =>
                  setDefaultRiskView(
                    event.target.value
                  )
                }
              >

                <option value="All">
                  All Risk Levels
                </option>

                <option value="Low">
                  Low Risk
                </option>

                <option value="Medium">
                  Medium Risk
                </option>

                <option value="High">
                  High Risk
                </option>

                <option value="Critical">
                  Critical Only
                </option>

              </select>

            </div>

          </section>


          <section className="settings-panel">

            <div className="settings-panel-title">

              <span>
                🛡
              </span>

              <div>

                <h2>
                  Safety Configuration
                </h2>

                <p>
                  Current NightGuard safety
                  rules for this build.
                </p>

              </div>

            </div>


            <div className="settings-info-grid">

              <div>

                <span>
                  Safety Countdown
                </span>

                <strong>
                  30 seconds
                </strong>

              </div>


              <div>

                <span>
                  Risk Engine
                </span>

                <strong>
                  Hybrid AI
                </strong>

              </div>


              <div>

                <span>
                  Location Updates
                </span>

                <strong>
                  Live GPS
                </strong>

              </div>


              <div>

                <span>
                  Emergency Email
                </span>

                <strong>
                  Enabled
                </strong>

              </div>

            </div>

          </section>


          <section className="settings-panel">

            <div className="settings-panel-title">

              <span>
                ℹ
              </span>

              <div>

                <h2>
                  System Information
                </h2>

                <p>
                  NightGuard current demo
                  environment.
                </p>

              </div>

            </div>


            <div className="system-information">

              <div>

                <span>
                  Application
                </span>

                <strong>
                  NightGuard
                </strong>

              </div>


              <div>

                <span>
                  Environment
                </span>

                <strong>
                  Development / Demo
                </strong>

              </div>


              <div>

                <span>
                  AI Monitoring
                </span>

                <strong className="system-active">
                  ● Active
                </strong>

              </div>


              <div>

                <span>
                  Emergency System
                </span>

                <strong className="system-active">
                  ● Operational
                </strong>

              </div>

            </div>

          </section>


        </div>


        <section className="settings-actions">

          <button
            className="settings-reset-btn"
            onClick={
              resetSettings
            }
          >
            Reset Defaults
          </button>


          <button
            className="settings-save-btn"
            onClick={
              saveSettings
            }
          >
            💾 Save Settings
          </button>

        </section>


        {message && (

          <div className="settings-success-message">

            ✅ {message}

          </div>

        )}

      </main>

    </div>
  );
}


export default AdminSettings;