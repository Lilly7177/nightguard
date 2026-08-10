import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import API_BASE_URL from "../api";

function Login() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const response = await axios.post(
                `${API_BASE_URL}/login`,
                null,
                {
                    params: formData
                }
            );

            if (response.data.message === "Login successful") {

                alert("Login successful");

                localStorage.setItem(
                    "user",
                    JSON.stringify(response.data.user)
                );

                navigate("/dashboard");

            } else {

                alert(response.data.message);

            }

        } catch (error) {

            console.log(error);
            alert("Login failed");

        }

    };

    return (

        <div className="login-page">

            <div className="login-card">

                <h1>🌙 NightGuard</h1>

                <p>Welcome Back</p>

                <form onSubmit={handleSubmit}>

                    <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <button
                        type="submit"
                        className="login-btn"
                    >
                        Login
                    </button>

                </form>

                <div className="register-link">

                    Don't have an account?

                    <br /><br />

                    <span onClick={() => navigate("/register")}>
                        Register Here
                    </span>

                </div>

            </div>

        </div>

    );

}

export default Login;