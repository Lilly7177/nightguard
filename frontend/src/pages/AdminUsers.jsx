import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AdminUsers.css";
import API_BASE_URL from "../api";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/users`
      );

      setUsers(response.data.users);

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="admin-users">

      <header className="admin-users-header">

        <button onClick={() => navigate("/admin/dashboard")}>
          ← Dashboard
        </button>

        <h1>👥 Manage Users</h1>

      </header>

      <table>

        <thead>

          <tr>

            <th>ID</th>

            <th>Name</th>

            <th>Email</th>

            <th>Phone</th>

            <th>Created</th>

          </tr>

        </thead>

        <tbody>

          {users.map((user) => (

            <tr key={user.id}>

              <td>{user.id}</td>

              <td>{user.full_name}</td>

              <td>{user.email}</td>

              <td>{user.phone_number}</td>

              <td>
                {new Date(user.created_at).toLocaleString()}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default AdminUsers;