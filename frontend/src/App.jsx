import { BrowserRouter, Routes, Route } from "react-router-dom";

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

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Home */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Authentication */}
        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        {/* User Dashboard */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* Features */}
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

        {/* Night Journey Setup */}
        <Route
          path="/monitoring"
          element={<MonitoringSetup />}
        />

        {/* Live Journey */}
        <Route
          path="/live-journey"
          element={<LiveJourney />}
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={<AdminLogin />}
        />

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

      </Routes>
    </BrowserRouter>
  );
}

export default App;