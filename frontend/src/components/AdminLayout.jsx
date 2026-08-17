import {
  NavLink,
  Outlet,
  useNavigate
} from "react-router-dom";

import "../styles/AdminLayout.css";


function AdminLayout() {
  const navigate = useNavigate();

  let admin = null;

  try {
    const savedAdmin =
      localStorage.getItem("admin");

    admin = savedAdmin
      ? JSON.parse(savedAdmin)
      : null;

  } catch (error) {
    console.error(
      "Unable to read admin:",
      error
    );
  }


  const handleLogout = () => {

    localStorage.removeItem("admin");

    navigate("/admin", {
      replace: true
    });

  };


  return (
    <div className="shared-admin-layout">


      {/* =====================================
          SIDEBAR
      ===================================== */}

      <aside className="shared-admin-sidebar">


        <div className="shared-admin-brand">

          <div className="shared-admin-brand-icon">
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



        <nav className="shared-admin-nav">


          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>▦</span>
            Dashboard
          </NavLink>


          <NavLink
            to="/admin/live-monitoring"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>⌖</span>
            Live Monitoring
          </NavLink>


          <NavLink
            to="/admin/alerts"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>🚨</span>
            Alerts
          </NavLink>


          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>👥</span>
            Users
          </NavLink>


          <NavLink
            to="/admin/contacts"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>☎</span>
            Trusted Contacts
          </NavLink>


          <NavLink
            to="/admin/reports"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>▤</span>
            Reports
          </NavLink>


          <NavLink
            to="/admin/analytics"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>▥</span>
            Analytics
          </NavLink>


          <NavLink
            to="/admin/statistics"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>📊</span>
            Statistics
          </NavLink>


          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              isActive
                ? "shared-admin-link active"
                : "shared-admin-link"
            }
          >
            <span>⚙</span>
            Settings
          </NavLink>

        </nav>



        <button
          type="button"
          className="shared-admin-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>



      {/* =====================================
          RIGHT SIDE
      ===================================== */}

      <div className="shared-admin-right">


        {/* HEADER */}

        <header className="shared-admin-header">


          <div>

            <p className="shared-admin-header-label">
              ADMIN CONTROL CENTER
            </p>

            <h2>
              NightGuard Administration
            </h2>

          </div>


          <div className="shared-admin-header-right">


            <div className="shared-admin-system-status">

              <span></span>

              System Online

            </div>


            <div className="shared-admin-profile">

              <div className="shared-admin-avatar">
                A
              </div>


              <div>

                <strong>
                  {admin?.full_name ||
                    "Administrator"}
                </strong>

                <small>
                  {admin?.email ||
                    "NightGuard Admin"}
                </small>

              </div>

            </div>

          </div>

        </header>



        {/* PAGE CONTENT */}

        <main className="shared-admin-content">

          <Outlet />

        </main>


      </div>


    </div>
  );
}


export default AdminLayout;