import "../styles/JourneySummary.css";

function JourneySummary({
  destination = "",
  journeyTime = "00:00",
  distanceWalked = 0,
  averageSpeed = 0,
  highestRisk = "Low",
  emergencyAlerts = 0,
  safetyScore = 100
}) {
  const stars =
    safetyScore >= 90
      ? "★★★★★"
      : safetyScore >= 75
      ? "★★★★☆"
      : safetyScore >= 60
      ? "★★★☆☆"
      : safetyScore >= 40
      ? "★★☆☆☆"
      : "★☆☆☆☆";

  return (
    <div className="journey-summary-overlay">

      <div className="journey-summary-card">

        <h2>🌙 Journey Safety Report</h2>

        <div className="summary-row">
          <span>🏁 Destination</span>
          <strong>{destination}</strong>
        </div>

        <div className="summary-row">
          <span>⏱ Journey Time</span>
          <strong>{journeyTime}</strong>
        </div>

        <div className="summary-row">
          <span>🚶 Distance Walked</span>
          <strong>{distanceWalked.toFixed(2)} miles</strong>
        </div>

        <div className="summary-row">
          <span>🏃 Average Walking Speed</span>
          <strong>{averageSpeed.toFixed(2)} m/s</strong>
        </div>

        <div className="summary-row">
          <span>📊 Highest Risk</span>
          <strong>{highestRisk}</strong>
        </div>

        <div className="summary-row">
          <span>🚨 Emergency Alerts</span>
          <strong>{emergencyAlerts}</strong>
        </div>

        <div className="summary-row">
          <span>🛡 Safety Score</span>
          <strong>{safetyScore}/100</strong>
        </div>

        <div className="summary-stars">
          {stars}
        </div>

        <div className="summary-status">
          ✅ Journey Completed Successfully
        </div>

      </div>

    </div>
  );
}

export default JourneySummary;