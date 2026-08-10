import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Settings.css";
import API_BASE_URL from "../api";

function Settings() {
  const navigate = useNavigate();

  let storedUser = null;

  try {
    const savedUser = localStorage.getItem("user");
    storedUser = savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error("Unable to read user data:", error);
  }

  const [formData, setFormData] = useState({
    full_name: storedUser?.full_name || "",
    phone_number: storedUser?.phone_number || ""
  });

  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!storedUser?.id) {
      setStatus("Please login again before updating your profile.");
      return;
    }

    if (!formData.full_name.trim()) {
      setStatus("Full name is required.");
      return;
    }

    if (!formData.phone_number.trim()) {
      setStatus("Phone number is required.");
      return;
    }

    try {
      setSaving(true);
      setStatus("Saving profile changes...");

      const response = await axios.put(
        `${API_BASE_URL}/users/${storedUser.id}`,
        {
          full_name: formData.full_name.trim(),
          phone_number: formData.phone_number.trim()
        }
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      setStatus(response.data.message);
    } catch (error) {
      console.error(error);

      setStatus(
        error.response?.data?.detail ||
        "Profile update failed."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">

      <header className="settings-header">

        <button
          type="button"
          className="settings-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <div className="settings-logo">
          🌙 NightGuard
        </div>

      </header>

      <main className="settings-content">

        <section className="settings-intro">

          <p className="settings-label">
            ACCOUNT SETTINGS
          </p>

          <h1>⚙️ Settings</h1>

          <p>
            Update your personal information and account preferences.
          </p>

        </section>

        <section className="settings-card">

          <h2>Edit Profile</h2>

          <form onSubmit={handleSubmit}>

            <div className="settings-form-group">

              <label htmlFor="settings-name">
                Full Name
              </label>

              <input
                id="settings-name"
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />

            </div>

            <div className="settings-form-group">

              <label htmlFor="settings-email">
                Email
              </label>

              <input
                id="settings-email"
                type="email"
                value={storedUser?.email || ""}
                disabled
              />

              <small>
                Email cannot be changed from this page.
              </small>

            </div>

            <div className="settings-form-group">

              <label htmlFor="settings-phone">
                Phone Number
              </label>

              <input
                id="settings-phone"
                type="text"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="Enter your phone number"
                required
              />

            </div>

            <button
              type="submit"
              className="settings-save-btn"
              disabled={saving}
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>

          </form>

          {status && (
            <div className="settings-status">
              {status}
            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default Settings;