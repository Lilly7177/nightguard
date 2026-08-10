import "../styles/JourneyTimeline.css";

function JourneyTimeline({
  journeyStarted = true,
  gpsConnected = true,
  monitoringActive = true,
  riskLevel = "Low",
  completed = false
}) {
  return (
    <section className="journey-timeline-card">

      <h3>🕒 Journey Timeline</h3>

      <div className="timeline">

        <div className="timeline-item completed">
          <div className="timeline-dot"></div>

          <div>
            <strong>Journey Started</strong>
            <p>Monitoring session created successfully.</p>
          </div>
        </div>

        <div
          className={`timeline-item ${
            gpsConnected ? "completed" : ""
          }`}
        >
          <div className="timeline-dot"></div>

          <div>
            <strong>GPS Connected</strong>
            <p>Live location tracking is active.</p>
          </div>
        </div>

        <div
          className={`timeline-item ${
            monitoringActive ? "completed" : ""
          }`}
        >
          <div className="timeline-dot"></div>

          <div>
            <strong>Journey Monitoring</strong>
            <p>NightGuard is monitoring your walk.</p>
          </div>
        </div>

        <div
          className={`timeline-item ${
            riskLevel === "Medium" ||
            riskLevel === "High"
              ? "warning"
              : ""
          }`}
        >
          <div className="timeline-dot"></div>

          <div>
            <strong>Risk Analysis</strong>
            <p>Current Risk: {riskLevel}</p>
          </div>
        </div>

        <div
          className={`timeline-item ${
            completed ? "completed" : ""
          }`}
        >
          <div className="timeline-dot"></div>

          <div>
            <strong>Destination Reached</strong>
            <p>
              {completed
                ? "Journey completed successfully."
                : "Waiting to reach destination."}
            </p>
          </div>
        </div>

      </div>

    </section>
  );
}

export default JourneyTimeline;