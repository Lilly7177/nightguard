import {
  useEffect,
  useMemo,
  useState
} from "react";

import axios from "axios";

import API_BASE_URL from "../api";

import "../styles/AdminReports.css";


function AdminReports() {

  const [reports, setReports] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");


  // =========================================
  // LOAD REPORTS
  // =========================================

  const loadReports = async () => {

    try {

      setLoading(true);
      setError("");

      const response =
        await axios.get(
          `${API_BASE_URL}/admin/reports`
        );

      setReports(
        response.data.reports || []
      );

    } catch (error) {

      console.error(
        "Reports error:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to load journey reports."
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadReports();

  }, []);


  // =========================================
  // FILTER REPORTS
  // =========================================

  const filteredReports =
    useMemo(() => {

      const searchText =
        search
          .trim()
          .toLowerCase();

      return reports.filter(
        (report) => {

          const matchesSearch =
            !searchText ||

            report.full_name
              ?.toLowerCase()
              .includes(searchText) ||

            report.email
              ?.toLowerCase()
              .includes(searchText) ||

            report.destination
              ?.toLowerCase()
              .includes(searchText);


          const matchesStatus =
            statusFilter === "All" ||
            report.status ===
              statusFilter;


          return (
            matchesSearch &&
            matchesStatus
          );

        }
      );

    }, [
      reports,
      search,
      statusFilter
    ]);


  // =========================================
  // FORMAT DATE
  // =========================================

  const formatDate = (
    value
  ) => {

    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleString();

  };


  // =========================================
  // DOWNLOAD CSV
  // =========================================

  const downloadCSV = () => {

    if (
      filteredReports.length === 0
    ) {

      alert(
        "There are no journey records to export."
      );

      return;

    }


    const headers = [

      "Session ID",
      "User ID",
      "User",
      "Email",
      "Phone",
      "Destination",
      "Status",
      "Risk Score",
      "Started",
      "Ended",
      "End Reason"

    ];


    const rows =
      filteredReports.map(
        (report) => [

          report.session_id,
          report.user_id,
          report.full_name,
          report.email,
          report.phone_number,
          report.destination,
          report.status,
          report.final_risk_score,
          formatDate(
            report.started_at
          ),
          formatDate(
            report.ended_at
          ),
          report.end_reason || ""

        ]
      );


    const csv =
      [
        headers,
        ...rows
      ]
        .map(
          (row) =>
            row
              .map(
                (value) =>
                  `"${String(
                    value ?? ""
                  ).replaceAll(
                    '"',
                    '""'
                  )}"`
              )
              .join(",")
        )
        .join("\n");


    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href = url;

    link.download =
      "nightguard-journey-report.csv";


    document.body.appendChild(
      link
    );

    link.click();

    link.remove();


    URL.revokeObjectURL(
      url
    );

  };


  // =========================================
  // STATUS CLASS
  // =========================================

  const getStatusClass = (
    status
  ) => {

    return (
      "report-status " +
      `status-${String(
        status || "unknown"
      )
        .toLowerCase()
        .replaceAll(
          " ",
          "-"
        )}`
    );

  };


  // =========================================
  // PAGE
  // =========================================

  return (

    <div className="admin-reports-content">


      {/* =====================================
          PAGE HEADING
      ===================================== */}

      <section
        className="admin-data-heading"
      >

        <div>

          <span>
            JOURNEY MANAGEMENT
          </span>


          <h1>
            📄 Journey Reports
          </h1>


          <p>
            Review historical NightGuard
            monitoring sessions and journey
            outcomes.
          </p>

        </div>


        <button
          type="button"
          className="admin-export-btn"
          onClick={downloadCSV}
          disabled={
            loading ||
            filteredReports.length === 0
          }
        >
          ⬇ Download CSV
        </button>

      </section>



      {/* =====================================
          SUMMARY
      ===================================== */}

      <section
        className="admin-report-summary"
      >

        <div>

          <span>
            Total Records
          </span>

          <strong>
            {reports.length}
          </strong>

        </div>


        <div>

          <span>
            Showing
          </span>

          <strong>
            {filteredReports.length}
          </strong>

        </div>


        <div>

          <span>
            Active
          </span>

          <strong>
            {
              reports.filter(
                (item) =>
                  item.status ===
                  "Active"
              ).length
            }
          </strong>

        </div>


        <div>

          <span>
            Completed
          </span>

          <strong>
            {
              reports.filter(
                (item) =>
                  item.status ===
                  "Journey Completed"
              ).length
            }
          </strong>

        </div>

      </section>



      {/* =====================================
          FILTERS
      ===================================== */}

      <section
        className="admin-filter-bar"
      >

        <input
          type="text"
          placeholder="Search user, email or destination..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />


        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
        >

          <option value="All">
            All Statuses
          </option>

          <option value="Active">
            Active
          </option>

          <option
            value="Journey Completed"
          >
            Completed
          </option>

          <option
            value="Emergency Triggered"
          >
            Emergency
          </option>

          <option
            value="Journey Cancelled"
          >
            Cancelled
          </option>

          <option
            value="Journey Interrupted"
          >
            Interrupted
          </option>

        </select>


        <button
          type="button"
          className="admin-report-refresh-btn"
          onClick={loadReports}
          disabled={loading}
        >

          {loading
            ? "Refreshing..."
            : "↻ Refresh"}

        </button>

      </section>



      {/* =====================================
          COUNT
      ===================================== */}

      <div
        className="admin-report-count"
      >

        Showing{" "}

        <strong>
          {filteredReports.length}
        </strong>{" "}

        journey records

      </div>



      {/* =====================================
          LOADING
      ===================================== */}

      {loading && (

        <div
          className="admin-data-message"
        >

          <div
            className="admin-report-loading-icon"
          >
            📄
          </div>

          Loading reports...

        </div>

      )}



      {/* =====================================
          ERROR
      ===================================== */}

      {!loading &&
        error && (

        <div
          className="
            admin-data-message
            error
          "
        >

          <h3>
            Unable to Load Reports
          </h3>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={loadReports}
          >
            Try Again
          </button>

        </div>

      )}



      {/* =====================================
          EMPTY
      ===================================== */}

      {!loading &&
        !error &&
        filteredReports.length ===
          0 && (

        <div
          className="admin-data-message"
        >

          <div
            className="admin-report-empty-icon"
          >
            📂
          </div>

          <h3>
            No Journey Records
          </h3>

          <p>
            No records match the selected
            filters.
          </p>

        </div>

      )}



      {/* =====================================
          REPORT TABLE
      ===================================== */}

      {!loading &&
        !error &&
        filteredReports.length >
          0 && (

        <div
          className="admin-table-wrapper"
        >

          <table
            className="admin-modern-table"
          >

            <thead>

              <tr>

                <th>
                  ID
                </th>

                <th>
                  User
                </th>

                <th>
                  Destination
                </th>

                <th>
                  Status
                </th>

                <th>
                  Risk
                </th>

                <th>
                  Started
                </th>

                <th>
                  Ended
                </th>

                <th>
                  End Reason
                </th>

              </tr>

            </thead>


            <tbody>

              {
                filteredReports.map(
                  (report) => (

                    <tr
                      key={
                        report.session_id
                      }
                    >

                      <td>

                        #
                        {
                          report.session_id
                        }

                      </td>


                      <td>

                        <strong>
                          {
                            report.full_name ||
                            "Unknown User"
                          }
                        </strong>

                        <small>
                          {
                            report.email ||
                            "No email"
                          }
                        </small>

                      </td>


                      <td>

                        {
                          report.destination ||
                          "—"
                        }

                      </td>


                      <td>

                        <span
                          className={
                            getStatusClass(
                              report.status
                            )
                          }
                        >

                          {
                            report.status ||
                            "Unknown"
                          }

                        </span>

                      </td>


                      <td>

                        <strong
                          className="risk-number"
                        >

                          {
                            report
                              .final_risk_score ??
                            0
                          }

                        </strong>

                      </td>


                      <td>

                        {
                          formatDate(
                            report.started_at
                          )
                        }

                      </td>


                      <td>

                        {
                          formatDate(
                            report.ended_at
                          )
                        }

                      </td>


                      <td>

                        {
                          report.end_reason ||
                          "—"
                        }

                      </td>

                    </tr>

                  )
                )
              }

            </tbody>

          </table>

        </div>

      )}


    </div>

  );

}


export default AdminReports;