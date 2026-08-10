import "../styles/SafetyMeter.css";

function SafetyMeter({
  riskScore = 0,
  riskLevel = "Low"
}) {
  const percentage = Math.min(
    100,
    Math.max(0, riskScore)
  );

  const getStatus = () => {
    switch (riskLevel.toLowerCase()) {
      case "low":
        return {
          text: "SAFE",
          className: "safe"
        };

      case "medium":
        return {
          text: "CAUTION",
          className: "medium"
        };

      case "high":
        return {
          text: "DANGER",
          className: "danger"
        };

      default:
        return {
          text: "UNKNOWN",
          className: "safe"
        };
    }
  };

  const status = getStatus();

  return (
    <section className="safety-meter-card">

      <div className="safety-header">

        <h3>🛡 Safety Meter</h3>

        <span className={status.className}>
          {status.text}
        </span>

      </div>

      <div className="meter-bar">

        <div
          className={`meter-fill ${status.className}`}
          style={{
            width: `${100 - percentage}%`
          }}
        />

      </div>

      <div className="meter-footer">

        <div>

          <small>Risk Score</small>

          <strong>{riskScore}</strong>

        </div>

        <div>

          <small>Safety</small>

          <strong>
            {100 - percentage}%
          </strong>

        </div>

      </div>

    </section>
  );
}

export default SafetyMeter;