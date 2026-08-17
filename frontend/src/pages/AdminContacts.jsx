import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminContacts.css";
import API_BASE_URL from "../api";


function AdminContacts() {
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit states
  const [editingContact, setEditingContact] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [saving, setSaving] = useState(false);


  // =====================================
  // Load Trusted Contacts
  // =====================================

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/admin/contacts`
      );

      setContacts(response.data.contacts || []);

    } catch (error) {
      console.error("Load contacts error:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to load trusted contacts."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadContacts();
  }, []);


  // =====================================
  // Open Edit Form
  // =====================================

  const handleEdit = (contact) => {
    setEditingContact(contact);

    setEditName(contact.contact_name || "");
    setEditPhone(contact.contact_phone || "");
    setEditRelationship(contact.relationship || "");
  };


  // =====================================
  // Cancel Edit
  // =====================================

  const handleCancelEdit = () => {
    setEditingContact(null);
    setEditName("");
    setEditPhone("");
    setEditRelationship("");
  };


  // =====================================
  // Save Updated Contact
  // =====================================

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!editingContact) {
      return;
    }

    if (!editName.trim()) {
      alert("Please enter the contact name.");
      return;
    }

    if (!editPhone.trim()) {
      alert("Please enter the contact phone number.");
      return;
    }

    if (!editRelationship.trim()) {
      alert("Please enter the relationship.");
      return;
    }

    try {
      setSaving(true);

      await axios.put(
        `${API_BASE_URL}/admin/contacts/${editingContact.id}`,
        {
          contact_name: editName.trim(),
          contact_phone: editPhone.trim(),
          relationship: editRelationship.trim(),
        }
      );

      alert("Trusted contact updated successfully.");

      handleCancelEdit();

      await loadContacts();

    } catch (error) {
      console.error("Update contact error:", error);

      alert(
        error.response?.data?.detail ||
        "Unable to update trusted contact."
      );

    } finally {
      setSaving(false);
    }
  };


  // =====================================
  // Delete Trusted Contact
  // =====================================

  const handleDelete = async (contact) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${contact.contact_name || "this trusted contact"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/admin/contacts/${contact.id}`
      );

      setContacts((currentContacts) =>
        currentContacts.filter(
          (item) => item.id !== contact.id
        )
      );

      alert("Trusted contact deleted successfully.");

    } catch (error) {
      console.error("Delete contact error:", error);

      alert(
        error.response?.data?.detail ||
        "Unable to delete trusted contact."
      );
    }
  };


  // =====================================
  // Page
  // =====================================

  return (
    <div className="admin-contacts-page">

      <header className="admin-contacts-header">

        <button
          type="button"
          className="admin-contacts-back-btn"
          onClick={() => navigate("/admin/dashboard")}
        >
          ← Admin Dashboard
        </button>

        <h2>🌙 NightGuard Admin</h2>

      </header>


      <main className="admin-contacts-content">

        <section className="admin-contacts-intro">

          <p className="admin-contacts-label">
            SAFETY NETWORK
          </p>

          <h1>📞 Trusted Contacts</h1>

          <p>
            View and manage emergency contacts registered
            by NightGuard users.
          </p>

        </section>


        {/* Summary */}

        <section className="admin-contacts-summary">

          <div className="admin-contact-summary-card">
            <span>Total Contacts</span>

            <strong>
              {contacts.length}
            </strong>
          </div>


          <div className="admin-contact-summary-card">
            <span>Registered Users</span>

            <strong>
              {
                new Set(
                  contacts.map(
                    (contact) => contact.user_id
                  )
                ).size
              }
            </strong>
          </div>

        </section>


        {/* Loading */}

        {loading && (
          <div className="admin-contacts-message">
            Loading trusted contacts...
          </div>
        )}


        {/* Error */}

        {!loading && error && (
          <div className="admin-contacts-message admin-contacts-error">

            <p>{error}</p>

            <button
              type="button"
              onClick={loadContacts}
            >
              Try Again
            </button>

          </div>
        )}


        {/* Empty */}

        {!loading &&
          !error &&
          contacts.length === 0 && (

            <div className="admin-contacts-empty">

              <h2>No trusted contacts found</h2>

              <p>
                Contacts added by users will appear here.
              </p>

            </div>
          )}


        {/* Contacts */}

        {!loading &&
          !error &&
          contacts.length > 0 && (

            <section className="admin-contacts-grid">

              {contacts.map((contact) => (

                <article
                  className="admin-contact-card"
                  key={contact.id}
                >

                  <div className="admin-contact-card-header">

                    <div className="admin-contact-avatar">
                      👤
                    </div>

                    <div>

                      <span className="admin-contact-id">
                        Emergency Contact
                      </span>

                      <h2>
                        {contact.contact_name ||
                          "Unnamed Contact"}
                      </h2>

                    </div>

                  </div>


                  <div className="admin-contact-details">

                    <div>
                      <span>Registered By</span>

                      <p>
                        {contact.full_name ||
                          "Not available"}
                      </p>
                    </div>


                    <div>
                      <span>User Email</span>

                      <p>
                        {contact.email ||
                          "Not available"}
                      </p>
                    </div>


                    <div>
                      <span>Contact Phone</span>

                      <p>
                        {contact.contact_phone ||
                          "Not available"}
                      </p>
                    </div>


                    <div>
                      <span>Relationship</span>

                      <p>
                        {contact.relationship ||
                          "Not available"}
                      </p>
                    </div>

                  </div>


                  {/* Admin Actions */}

                  <div className="admin-contact-actions">

                    <button
                      type="button"
                      className="admin-contact-edit-btn"
                      onClick={() =>
                        handleEdit(contact)
                      }
                    >
                      ✏️ Edit
                    </button>


                    <button
                      type="button"
                      className="admin-contact-delete-btn"
                      onClick={() =>
                        handleDelete(contact)
                      }
                    >
                      🗑️ Delete
                    </button>

                  </div>

                </article>

              ))}

            </section>
          )}


        {/* =====================================
            Edit Contact Modal
        ===================================== */}

        {editingContact && (

          <div className="admin-edit-overlay">

            <div className="admin-edit-modal">

              <div className="admin-edit-modal-header">

                <div>
                  <p className="admin-contacts-label">
                    ADMIN CONTROL
                  </p>

                  <h2>
                    ✏️ Edit Trusted Contact
                  </h2>
                </div>


                <button
                  type="button"
                  className="admin-edit-close-btn"
                  onClick={handleCancelEdit}
                >
                  ✕
                </button>

              </div>


              <div className="admin-edit-user-info">

                <span>
                  Contact registered by
                </span>

                <strong>
                  {editingContact.full_name ||
                    "Unknown User"}
                </strong>

                <small>
                  {editingContact.email || ""}
                </small>

              </div>


              <form
                onSubmit={handleSaveEdit}
                className="admin-edit-form"
              >

                <label>
                  Contact Name

                  <input
                    type="text"
                    value={editName}
                    onChange={(event) =>
                      setEditName(
                        event.target.value
                      )
                    }
                    placeholder="Contact name"
                    required
                  />
                </label>


                <label>
                  Contact Phone

                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(event) =>
                      setEditPhone(
                        event.target.value
                      )
                    }
                    placeholder="Phone number"
                    required
                  />
                </label>


                <label>
                  Relationship

                  <input
                    type="text"
                    value={editRelationship}
                    onChange={(event) =>
                      setEditRelationship(
                        event.target.value
                      )
                    }
                    placeholder="Example: Mother"
                    required
                  />
                </label>


                <div className="admin-edit-buttons">

                  <button
                    type="button"
                    className="admin-edit-cancel-btn"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="admin-edit-save-btn"
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

      </main>

    </div>
  );
}


export default AdminContacts;