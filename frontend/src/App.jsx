import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";


import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Emergency from "./pages/Emergency";
import History from "./pages/History";
import Settings from "./pages/Settings";


import MonitoringSetup from "./pages/MonitoringSetup";
import LiveJourney from "./pages/LiveJourney";


import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminAlerts from "./pages/AdminAlerts";
import AdminContacts from "./pages/AdminContacts";

import AdminReports from "./pages/AdminReports";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminStatistics from "./pages/AdminStatistics";
import AdminSettings from "./pages/AdminSettings";

import AdminLiveMonitoring from "./pages/AdminLiveMonitoring";
import AdminLiveJourney from "./pages/AdminLiveJourney";

import AdminLayout from "./components/AdminLayout";


function App() {

  return (

    <BrowserRouter>

      <Routes>


        {/* =====================================
            USER SIDE
        ===================================== */}


        <Route
          path="/"
          element={<Home />}
        />


        <Route
          path="/register"
          element={<Register />}
        />


        <Route
          path="/login"
          element={<Login />}
        />


        <Route
          path="/dashboard"
          element={<Dashboard />}
        />


        <Route
          path="/contacts"
          element={<Contacts />}
        />


        <Route
          path="/emergency"
          element={<Emergency />}
        />


        <Route
          path="/history"
          element={<History />}
        />


        <Route
          path="/settings"
          element={<Settings />}
        />


        <Route
          path="/monitoring"
          element={<MonitoringSetup />}
        />


        <Route
          path="/live-journey"
          element={<LiveJourney />}
        />



        {/* =====================================
            ADMIN LOGIN
        ===================================== */}


        <Route
          path="/admin"
          element={<AdminLogin />}
        />



        {/* =====================================
            EXISTING ADMIN PAGES
        ===================================== */}


        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />


        <Route
          path="/admin/users"
          element={<AdminUsers />}
        />


        <Route
          path="/admin/alerts"
          element={<AdminAlerts />}
        />


        <Route
          path="/admin/contacts"
          element={<AdminContacts />}
        />


        <Route
          path="/admin/live-monitoring"
          element={<AdminLiveMonitoring />}
        />


        <Route
          path="/admin/live-monitoring/:sessionId"
          element={<AdminLiveJourney />}
        />



        {/* =====================================
            SHARED ADMIN LAYOUT

            Reports / Analytics /
            Statistics / Settings
        ===================================== */}


        <Route
          element={<AdminLayout />}
        >


          <Route
            path="/admin/reports"
            element={<AdminReports />}
          />


          <Route
            path="/admin/analytics"
            element={<AdminAnalytics />}
          />


          <Route
            path="/admin/statistics"
            element={<AdminStatistics />}
          />


          <Route
            path="/admin/settings"
            element={<AdminSettings />}
          />


        </Route>


      </Routes>

    </BrowserRouter>

  );

}


export default App;