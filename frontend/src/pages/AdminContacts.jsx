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

  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_BASE_URL}/admin/contacts`
        );

        setContacts(response.data.contacts || []);
      } catch (error) {
        console.error(error);

        setError(
          error.response?.data?.detail ||
          "Unable to load trusted contacts."
        );
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

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
            View all emergency contacts registered by NightGuard users.
          </p>

        </section>

        <section className="admin-contacts-summary">

          <div className="admin-contact-summary-card">
            <span>Total Contacts</span>
            <strong>{contacts.length}</strong>
          </div>

          <div className="admin-contact-summary-card">
            <span>Registered Users</span>
            <strong>
              {
                new Set(
                  contacts.map((contact) => contact.user_id)
                ).size
              }
            </strong>
          </div>

        </section>

        {loading && (
          <div className="admin-contacts-message">
            Loading trusted contacts...
          </div>
        )}

        {!loading && error && (
          <div className="admin-contacts-message admin-contacts-error">
            {error}
          </div>
        )}

        {!loading && !error && contacts.length === 0 && (
          <div className="admin-contacts-empty">
            <h2>No trusted contacts found</h2>
            <p>
              Contacts added by users will appear here.
            </p>
          </div>
        )}

        {!loading && !error && contacts.length > 0 && (
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
                      {contact.contact_name || "Unnamed Contact"}
                    </h2>
                  </div>

                </div>

                <div className="admin-contact-details">

                  <div>
                    <span>Registered By</span>
                    <p>{contact.full_name || "Not available"}</p>
                  </div>

                  <div>
                    <span>User Email</span>
                    <p>{contact.email || "Not available"}</p>
                  </div>

                  <div>
                    <span>Contact Phone</span>
                    <p>
                      {contact.contact_phone || "Not available"}
                    </p>
                  </div>

                  <div>
                    <span>Relationship</span>
                    <p>
                      {contact.relationship || "Not available"}
                    </p>
                  </div>

                </div>

              </article>
            ))}

          </section>
        )}

      </main>

    </div>
  );
}

export default AdminContacts;