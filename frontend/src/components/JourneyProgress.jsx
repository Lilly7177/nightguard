import "../styles/JourneyProgress.css";

function JourneyProgress({
  totalDistance = 0,
  remainingDistance = 0
}) {
  const safeTotalDistance =
    Number.isFinite(totalDistance)
      ? Math.max(0, totalDistance)
      : 0;

  const safeRemainingDistance =
    Number.isFinite(remainingDistance)
      ? Math.max(0, remainingDistance)
      : 0;

  const travelled = Math.max(
    0,
    safeTotalDistance - safeRemainingDistance
  );

  const percentage =
    safeTotalDistance > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (travelled / safeTotalDistance) * 100
            )
          )
        )
      : 0;

  return (
    <section className="journey-progress-card">

      <div className="journey-progress-header">

        <h3>📊 Journey Progress</h3>

        <span>{percentage}%</span>

      </div>

      <div className="journey-progress-bar">

        <div
          className="journey-progress-fill"
          style={{
            width: `${percentage}%`
          }}
        />

      </div>

      <div className="journey-progress-details">

        <div>

          <small>Total Distance</small>

          <strong>
            {safeTotalDistance.toFixed(2)} mi
          </strong>

        </div>

        <div>

          <small>Distance Walked</small>

          <strong>
            {travelled.toFixed(2)} mi
          </strong>

        </div>

        <div>

          <small>Distance Left</small>

          <strong>
            {safeRemainingDistance.toFixed(2)} mi
          </strong>

        </div>

      </div>

    </section>
  );
}

export default JourneyProgress;