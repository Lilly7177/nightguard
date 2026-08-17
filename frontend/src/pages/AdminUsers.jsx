import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminUsers.css";
import API_BASE_URL from "../api";


function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [checkingLocationUserId, setCheckingLocationUserId] =
    useState(null);


  // =====================================
  // Load Users
  // =====================================

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/admin/users`
      );

      setUsers(response.data.users || []);

    } catch (error) {
      console.error("Load users error:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to load registered users."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadUsers();
  }, []);


  // =====================================
  // VIEW USER LIVE LOCATION
  // =====================================

  const handleViewLocation = async (user) => {
    try {
      setCheckingLocationUserId(user.id);

      const response = await axios.get(
        `${API_BASE_URL}/admin/live-monitoring`
      );

      const journeys = response.data.journeys || [];

      // Find active journey belonging to selected user
      const activeJourney = journeys.find(
        (journey) =>
          Number(journey.user_id) === Number(user.id)
      );

      if (!activeJourney) {
        alert(
          `${user.full_name || "This user"} currently has no active monitored journey.`
        );
        return;
      }

      // Go to this user's live journey
      navigate(
        `/admin/live-monitoring/${activeJourney.session_id}`
      );

    } catch (error) {
      console.error(
        "Check user live location error:",
        error
      );

      alert(
        error.response?.data?.detail ||
        "Unable to check this user's live location."
      );

    } finally {
      setCheckingLocationUserId(null);
    }
  };


  // =====================================
  // Open Edit Modal
  // =====================================

  const handleEdit = (user) => {
    setEditingUser(user);

    setEditName(user.full_name || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone_number || "");
  };


  // =====================================
  // Close Edit Modal
  // =====================================

  const handleCancelEdit = () => {
    setEditingUser(null);

    setEditName("");
    setEditEmail("");
    setEditPhone("");
  };


  // =====================================
  // Save User Changes
  // =====================================

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    if (!editName.trim()) {
      alert("Please enter the user's name.");
      return;
    }

    if (!editEmail.trim()) {
      alert("Please enter the user's email.");
      return;
    }

    if (!editPhone.trim()) {
      alert("Please enter the user's phone number.");
      return;
    }

    try {
      setSaving(true);

      await axios.put(
        `${API_BASE_URL}/admin/users/${editingUser.id}`,
        {
          full_name: editName.trim(),
          email: editEmail.trim(),
          phone_number: editPhone.trim(),
        }
      );

      alert("User updated successfully.");

      handleCancelEdit();

      await loadUsers();

    } catch (error) {
      console.error("Update user error:", error);

      alert(
        error.response?.data?.detail ||
        "Unable to update user."
      );

    } finally {
      setSaving(false);
    }
  };


  // =====================================
  // Delete User
  // =====================================

  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${
        user.full_name || "this user"
      }?\n\nTheir related NightGuard data may also be removed.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/admin/users/${user.id}`
      );

      setUsers((currentUsers) =>
        currentUsers.filter(
          (item) => item.id !== user.id
        )
      );

      alert("User deleted successfully.");

    } catch (error) {
      console.error("Delete user error:", error);

      alert(
        error.response?.data?.detail ||
        "Unable to delete user."
      );
    }
  };


  // =====================================
  // Page
  // =====================================

  return (
    <div className="admin-users">

      <header className="admin-users-header">

        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
        >
          ← Dashboard
        </button>

        <h1>👥 Manage Users</h1>

      </header>


      {loading && (
        <div className="admin-users-message">
          Loading registered users...
        </div>
      )}


      {!loading && error && (
        <div className="admin-users-message admin-users-error">

          <p>{error}</p>

          <button
            type="button"
            onClick={loadUsers}
          >
            Try Again
          </button>

        </div>
      )}


      {!loading && !error && users.length === 0 && (
        <div className="admin-users-message">
          No registered users found.
        </div>
      )}


      {!loading && !error && users.length > 0 && (

        <div className="admin-users-table-wrapper">

          <table className="admin-users-table">

            <thead>

              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>

            </thead>


            <tbody>

              {users.map((user) => (

                <tr key={user.id}>

                  <td>{user.id}</td>

                  <td>
                    {user.full_name || "Not available"}
                  </td>

                  <td>
                    {user.email || "Not available"}
                  </td>

                  <td>
                    {user.phone_number || "Not available"}
                  </td>

                  <td>
                    {user.created_at
                      ? new Date(
                          user.created_at
                        ).toLocaleString()
                      : "Not available"}
                  </td>


                  <td>

                    <div className="admin-user-actions">

                      {/* LIVE LOCATION */}

                      <button
                        type="button"
                        className="admin-user-location-btn"
                        onClick={() =>
                          handleViewLocation(user)
                        }
                        disabled={
                          checkingLocationUserId === user.id
                        }
                      >
                        {checkingLocationUserId === user.id
                          ? "Checking..."
                          : "📍 View Location"}
                      </button>


                      {/* EDIT */}

                      <button
                        type="button"
                        className="admin-user-edit-btn"
                        onClick={() => handleEdit(user)}
                      >
                        ✏️ Edit
                      </button>


                      {/* DELETE */}

                      <button
                        type="button"
                        className="admin-user-delete-btn"
                        onClick={() => handleDelete(user)}
                      >
                        🗑️ Delete
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}


      {/* =====================================
          EDIT USER MODAL
      ===================================== */}

      {editingUser && (

        <div className="admin-user-edit-overlay">

          <div className="admin-user-edit-modal">

            <div className="admin-user-edit-header">

              <div>

                <p className="admin-user-edit-label">
                  ADMIN CONTROL
                </p>

                <h2>
                  ✏️ Edit Registered User
                </h2>

              </div>


              <button
                type="button"
                className="admin-user-edit-close"
                onClick={handleCancelEdit}
              >
                ✕
              </button>

            </div>


            <div className="admin-user-id-box">

              <span>User ID</span>

              <strong>
                #{editingUser.id}
              </strong>

            </div>


            <form
              className="admin-user-edit-form"
              onSubmit={handleSaveEdit}
            >

              <label>

                Full Name

                <input
                  type="text"
                  value={editName}
                  onChange={(event) =>
                    setEditName(event.target.value)
                  }
                  placeholder="Full name"
                  required
                />

              </label>


              <label>

                Email Address

                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) =>
                    setEditEmail(event.target.value)
                  }
                  placeholder="Email"
                  required
                />

              </label>


              <label>

                Phone Number

                <input
                  type="tel"
                  value={editPhone}
                  onChange={(event) =>
                    setEditPhone(event.target.value)
                  }
                  placeholder="Phone number"
                  required
                />

              </label>


              <div className="admin-user-edit-buttons">

                <button
                  type="button"
                  className="admin-user-cancel-btn"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="admin-user-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


export default AdminUsers;