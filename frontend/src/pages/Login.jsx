import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "../styles/Login.css";
import API_BASE_URL from "../api";


function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState({
      email: "",
      password: ""
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]:
        event.target.value
    });

    setError("");
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await axios.post(
          `${API_BASE_URL}/login`,
          null,
          {
            params: formData
          }
        );


      if (
        response.data.message ===
        "Login successful"
      ) {

        /*
          Save logged-in user first.
        */
        localStorage.setItem(
          "user",
          JSON.stringify(
            response.data.user
          )
        );


        /*
          Immediately go to dashboard.

          No blocking alert().
          We pass loginSuccess so Dashboard
          can show a small toast.
        */
        navigate(
          "/dashboard",
          {
            replace: true,

            state: {
              loginSuccess: true,

              loginMessage:
                "Login successful"
            }
          }
        );

        return;
      }


      setError(
        response.data.message ||
        "Unable to login."
      );


    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      setError(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Invalid email or password."
      );


    } finally {

      setLoading(false);
    }
  };


  return (
    <div className="login-page">

      <div className="login-card">

        <h1>
          🌙 NightGuard
        </h1>

        <p>
          Welcome Back
        </p>


        <form
          onSubmit={handleSubmit}
        >

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
          />


          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
          />


          {error && (
            <div
              style={{
                marginBottom: "14px",
                padding: "10px 12px",
                borderRadius: "8px",
                background:
                  "rgba(239, 68, 68, 0.12)",
                border:
                  "1px solid rgba(239, 68, 68, 0.35)",
                color: "#fca5a5",
                fontSize: "14px",
                textAlign: "center"
              }}
            >
              ⚠️ {error}
            </div>
          )}


          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >

            {loading
              ? "Logging in..."
              : "Login"}

          </button>

        </form>


        <div className="register-link">

          Don&apos;t have an account?

          <br />
          <br />

          <span
            onClick={() =>
              navigate("/register")
            }
          >
            Register Here
          </span>

        </div>

      </div>

    </div>
  );
}


export default Login;