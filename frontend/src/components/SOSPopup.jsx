import {
  useEffect,
  useRef,
  useState
} from "react";

import "../styles/SOSPopup.css";

function SOSPopup({
  visible,
  onSafe,
  onEmergency
}) {
  const [countdown, setCountdown] =
    useState(30);

  const emergencyCallbackRef =
    useRef(onEmergency);

  const emergencyTriggeredRef =
    useRef(false);

  useEffect(() => {
    emergencyCallbackRef.current =
      onEmergency;
  }, [onEmergency]);

  useEffect(() => {
    if (!visible) {
      setCountdown(30);
      emergencyTriggeredRef.current =
        false;

      return;
    }

    /*
      Use a fixed finishing time instead of
      subtracting one every interval.

      This keeps the countdown accurate even if
      the browser delays JavaScript timers.
    */
    const finishTime =
      Date.now() + 30000;

    setCountdown(30);

    emergencyTriggeredRef.current =
      false;

    const updateCountdown = () => {
      const millisecondsRemaining =
        finishTime - Date.now();

      const secondsRemaining = Math.max(
        0,
        Math.ceil(
          millisecondsRemaining / 1000
        )
      );

      setCountdown(secondsRemaining);

      if (
        secondsRemaining === 0 &&
        !emergencyTriggeredRef.current
      ) {
        emergencyTriggeredRef.current =
          true;

        emergencyCallbackRef.current?.();
      }
    };

    updateCountdown();

    const timer = window.setInterval(
      updateCountdown,
      250
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="sos-overlay">

      <div className="sos-popup">

        <div className="sos-icon">
          🚨
        </div>

        <h2>Safety Check</h2>

        <p>
          NightGuard has detected that you have
          stopped moving.
        </p>

        <p>Are you safe?</p>

        <div className="countdown-circle">
          {countdown}
        </div>

        <div className="countdown-text">
          Automatic emergency alert in{" "}
          <strong>
            {countdown} seconds
          </strong>
        </div>

        <div className="sos-buttons">

          <button
            type="button"
            className="safe-btn"
            onClick={onSafe}
          >
            ✅ I&apos;m Safe
          </button>

          <button
            type="button"
            className="help-btn"
            onClick={onEmergency}
          >
            🚨 Need Help
          </button>

        </div>

      </div>

    </div>
  );
}

export default SOSPopup;