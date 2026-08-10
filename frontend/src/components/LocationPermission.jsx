function LocationPermission({
  visible,
  onAllow,
  onCancel
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="sound-permission-overlay">

      <div className="sound-permission-card">

        <div className="sound-permission-icon">
          📍
        </div>

        <h2>Enable Live Location</h2>

        <p>
          NightGuard needs access to your live
          location to monitor your journey until
          you reach your destination safely.
        </p>

        <div className="sound-permission-actions">

          <button
            type="button"
            className="sound-allow-btn"
            onClick={onAllow}
          >
            📍 Allow Location
          </button>

          <button
            type="button"
            className="sound-muted-btn"
            onClick={onCancel}
          >
            Cancel
          </button>

        </div>

      </div>

    </div>
  );
}

export default LocationPermission;