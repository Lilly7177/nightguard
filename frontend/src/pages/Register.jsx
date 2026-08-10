import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Register.css";
import API_BASE_URL from "../api";

function Register() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        phone_number: ""
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
                  `${API_BASE_URL}/register`,
                null,
                {
                    params: formData
                }
            );

            alert(response.data.message);

            setFormData({
                full_name: "",
                email: "",
                password: "",
                phone_number: ""
            });

            navigate("/login");

        } catch (error) {

            console.log(error);

            alert(
                JSON.stringify(
                    error.response?.data || error.message
                )
            );

        }
    };

    return (

        <div className="register-page">

            <div className="register-card">

                <h1>🌙 NightGuard</h1>

                <p>Create Your Account</p>

                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        name="full_name"
                        placeholder="Full Name"
                        value={formData.full_name}
                        onChange={handleChange}
                        required
                    />

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

                    <input
                        type="text"
                        name="phone_number"
                        placeholder="Phone Number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        required
                    />

                    <button
                        type="submit"
                        className="register-btn"
                    >
                        Create Account
                    </button>

                </form>

                <div className="login-link">

                    Already have an account?

                    <br /><br />

                    <span onClick={() => navigate("/login")}>
                        Login Here
                    </span>

                </div>

            </div>

        </div>

    );

}

export default Register;