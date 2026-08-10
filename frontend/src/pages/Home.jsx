import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

function Home() {

    const navigate = useNavigate();

    return (

        <div className="hero">

            <div className="hero-container">

                <div className="hero-text">

                    <h1>🌙 NightGuard</h1>

                    <p>

                        Your AI-powered personal safety companion.

                        Stay protected with smart monitoring,

                        trusted contacts, and instant emergency alerts.

                    </p>

                    <div className="hero-buttons">

                        <button
                            className="hero-btn primary"
                            onClick={() => navigate("/register")}
                        >
                            Register
                        </button>

                        <button
                            className="hero-btn secondary"
                            onClick={() => navigate("/login")}
                        >
                            Login
                        </button>

                    </div>

                </div>

                <div className="features">

                    <div className="feature-card">
                        <h3>👥 Trusted Contacts</h3>
                        <p>Add emergency contacts for quick assistance.</p>
                    </div>

                    <div className="feature-card">
                        <h3>🚨 Emergency Alerts</h3>
                        <p>Send emergency notifications instantly.</p>
                    </div>

                    <div className="feature-card">
                        <h3>📍 Live Location</h3>
                        <p>Share your location with trusted contacts.</p>
                    </div>

                    <div className="feature-card">
                        <h3>🤖 AI Monitoring</h3>
                        <p>Detect unusual activity and improve personal safety.</p>
                    </div>

                </div>

            </div>

        </div>

    );

}

export default Home;