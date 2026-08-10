import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import axios from "axios";
import API_BASE_URL from "../api";

import "../styles/Contacts.css";



function Contacts() {
  const navigate = useNavigate();

  let user = null;

  try {
    const savedUser =
      localStorage.getItem("user");

    user = savedUser
      ? JSON.parse(savedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to read user information:",
      error
    );
  }


  const [contacts, setContacts] =
    useState([]);

  const [formData, setFormData] =
    useState({
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      relationship: ""
    });

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("information");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);


  const showMessage = (
    text,
    type = "information"
  ) => {
    setMessage(text);
    setMessageType(type);
  };


  const loadContacts = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/contacts/${user.id}`
      );

      setContacts(
        response.data.contacts || []
      );
    } catch (error) {
      console.error(
        "Unable to load contacts:",
        error
      );

      showMessage(
        error.response?.data?.detail ||
          "Unable to load contacts.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!user?.id) {
      navigate("/login", {
        replace: true
      });

      return;
    }

    loadContacts();
  }, []);


  const handleChange = (event) => {
    const {
      name,
      value
    } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value
    }));
  };


  const addContact = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      showMessage(
        "Please log in before adding a trusted contact.",
        "error"
      );

      return;
    }

    try {
      setSubmitting(true);

      showMessage(
        "Adding trusted contact...",
        "information"
      );

      const response = await axios.post(
        `${API_BASE_URL}/contacts`,
        {
          user_id: user.id,
          contact_name:
            formData.contact_name.trim(),
          contact_phone:
            formData.contact_phone.trim(),
          contact_email:
            formData.contact_email.trim(),
          relationship:
            formData.relationship.trim()
        }
      );

      showMessage(
        response.data.message ||
          "Trusted contact added successfully.",
        "success"
      );

      setFormData({
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        relationship: ""
      });

      await loadContacts();
    } catch (error) {
      console.error(
        "Unable to add contact:",
        error
      );

      showMessage(
        error.response?.data?.detail ||
          "Unable to add contact.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };


  const deleteContact = async (
    contactId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this contact?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(contactId);

      await axios.delete(
        `${API_BASE_URL}/contacts/${contactId}`
      );

      showMessage(
        "Contact deleted successfully.",
        "success"
      );

      await loadContacts();
    } catch (error) {
      console.error(
        "Unable to delete contact:",
        error
      );

      showMessage(
        error.response?.data?.detail ||
          "Unable to delete contact.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div className="contacts-page">

      <header className="contacts-header">

        <button
          type="button"
          className="back-btn"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          ← Back to Dashboard
        </button>

        <h1>
          🌙 NightGuard
        </h1>

      </header>


      <main className="contacts-container">

        <section className="contacts-heading">

          <p className="contacts-label">
            SAFETY NETWORK
          </p>

          <h2>
            👥 Trusted Contacts
          </h2>

          <p>
            Add people who should receive emergency
            notifications when NightGuard detects that
            you may need help.
          </p>

        </section>


        <section className="contacts-layout">

          <div className="contact-form-card">

            <h3>
              Add New Contact
            </h3>

            <form onSubmit={addContact}>

              <input
                type="text"
                name="contact_name"
                placeholder="Contact Name"
                value={formData.contact_name}
                onChange={handleChange}
                required
              />

              <input
                type="tel"
                name="contact_phone"
                placeholder="Phone Number"
                value={formData.contact_phone}
                onChange={handleChange}
                required
              />

              <input
                type="email"
                name="contact_email"
                placeholder="Email Address"
                value={formData.contact_email}
                onChange={handleChange}
                required
              />

              <input
                type="text"
                name="relationship"
                placeholder="Relationship"
                value={formData.relationship}
                onChange={handleChange}
                required
              />

              <button
                type="submit"
                className="add-contact-btn"
                disabled={submitting}
              >
                {submitting
                  ? "Adding Contact..."
                  : "Add Trusted Contact"}
              </button>

            </form>


            {message && (
              <p
                className={
                  `contact-message ` +
                  `contact-message-${messageType}`
                }
              >
                {message}
              </p>
            )}

          </div>


          <div className="saved-contacts-section">

            <div className="saved-contacts-title">

              <h3>
                Saved Contacts
              </h3>

              <span>
                {contacts.length}{" "}
                contact
                {contacts.length !== 1
                  ? "s"
                  : ""}
              </span>

            </div>


            {loading ? (
              <div className="empty-contacts">

                <span>
                  ⏳
                </span>

                <h4>
                  Loading contacts...
                </h4>

              </div>
            ) : contacts.length === 0 ? (
              <div className="empty-contacts">

                <span>
                  👥
                </span>

                <h4>
                  No trusted contacts yet
                </h4>

                <p>
                  Add your first emergency contact
                  using the form.
                </p>

              </div>
            ) : (
              <div className="contacts-list">

                {contacts.map((contact) => (
                  <article
                    className="contact-card"
                    key={contact.id}
                  >

                    <div className="contact-avatar">
                      {contact.contact_name
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>


                    <div className="contact-info">

                      <h4>
                        {contact.contact_name}
                      </h4>

                      <p>
                        📱 {contact.contact_phone}
                      </p>

                      <p>
                        ✉️ {contact.contact_email}
                      </p>

                      <p>
                        🤝 {contact.relationship}
                      </p>

                    </div>


                    <button
                      type="button"
                      className="delete-contact-btn"
                      onClick={() =>
                        deleteContact(contact.id)
                      }
                      disabled={
                        deletingId === contact.id
                      }
                    >
                      {deletingId === contact.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>

                  </article>
                ))}

              </div>
            )}

          </div>

        </section>

      </main>

    </div>
  );
}

export default Contacts;