import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminLogin.css";
import API_BASE_URL from "../api";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setStatus("");

    try {
      const response = await axios.post(
         `${API_BASE_URL}/admin/login`,
        {
          email,
          password
        }
      );

      localStorage.setItem(
        "admin",
        JSON.stringify(response.data.admin)
      );

      navigate("/admin/dashboard");

    } catch (error) {

      setStatus(
        error.response?.data?.detail ||
        "Login failed"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">

      <div className="admin-login-card">

        <h1>🌙 NightGuard Admin</h1>

        <p>Administrator Login</p>

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            placeholder="admin@nightguard.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {status && (
          <div className="admin-status">
            {status}
          </div>
        )}

      </div>

    </div>
  );
}

export default AdminLogin;