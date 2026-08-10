function SoundPermission({
  visible,
  onAllow,
  onMuted
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="sound-permission-overlay">

      <div className="sound-permission-card">

        <div className="sound-permission-icon">
          🔊
        </div>

        <h2>Enable Safety Sounds</h2>

        <p>
          NightGuard uses warning and emergency
          alarm sounds during safety checks.
        </p>

        <div className="sound-permission-actions">

          <button
            type="button"
            className="sound-allow-btn"
            onClick={onAllow}
          >
            🔊 Allow Sound
          </button>

          <button
            type="button"
            className="sound-muted-btn"
            onClick={onMuted}
          >
            Continue Muted
          </button>

        </div>

      </div>

    </div>
  );
}

export default SoundPermission;