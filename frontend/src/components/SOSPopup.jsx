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

  const [
    countdown,
    setCountdown
  ] = useState(30);


  /*
   * Keep the latest emergency callback
   * without restarting the timer whenever
   * the parent component re-renders.
   */
  const emergencyCallbackRef =
    useRef(onEmergency);


  /*
   * Prevent duplicate actions.
   *
   * This protects against situations such as:
   *
   * - user presses Need Help exactly when
   *   the countdown reaches zero
   *
   * - user presses I'm Safe exactly when
   *   the automatic emergency fires
   *
   * - user presses a button multiple times
   */
  const actionTriggeredRef =
    useRef(false);


  // =========================================
  // KEEP EMERGENCY CALLBACK UPDATED
  // =========================================

  useEffect(() => {

    emergencyCallbackRef.current =
      onEmergency;

  }, [
    onEmergency
  ]);


  // =========================================
  // COUNTDOWN
  // =========================================

  useEffect(() => {

    /*
     * Reset everything whenever the popup
     * is closed.
     */
    if (!visible) {

      setCountdown(30);

      actionTriggeredRef.current =
        false;

      return;
    }


    /*
     * Use an absolute finishing time rather
     * than simply subtracting 1 every second.
     *
     * This keeps the countdown more accurate
     * if the browser delays JavaScript timers.
     */
    const finishTime =
      Date.now() + 30000;


    setCountdown(30);


    actionTriggeredRef.current =
      false;


    const updateCountdown =
      () => {

        const millisecondsRemaining =
          finishTime -
          Date.now();


        const secondsRemaining =
          Math.max(
            0,
            Math.ceil(
              millisecondsRemaining /
              1000
            )
          );


        setCountdown(
          secondsRemaining
        );


        /*
         * Countdown finished.
         *
         * Trigger the emergency exactly once.
         */
        if (
          secondsRemaining === 0 &&
          !actionTriggeredRef.current
        ) {

          actionTriggeredRef.current =
            true;


          emergencyCallbackRef
            .current?.();

        }

      };


    /*
     * Run immediately so the displayed
     * countdown is synchronised.
     */
    updateCountdown();


    /*
     * Check four times per second.
     *
     * The displayed value is still in
     * seconds, but this makes reaching
     * zero more accurate.
     */
    const timer =
      window.setInterval(
        updateCountdown,
        250
      );


    return () => {

      window.clearInterval(
        timer
      );

    };

  }, [
    visible
  ]);


  // =========================================
  // USER CONFIRMS SAFE
  // =========================================

  const handleSafe =
    () => {

      /*
       * Do nothing if another action has
       * already fired.
       */
      if (
        actionTriggeredRef.current
      ) {

        return;

      }


      /*
       * Lock the popup immediately.
       *
       * This prevents the countdown from
       * firing an emergency at the same
       * moment.
       */
      actionTriggeredRef.current =
        true;


      onSafe?.();

    };


  // =========================================
  // USER REQUESTS HELP
  // =========================================

  const handleEmergency =
    () => {

      /*
       * Prevent double emergency calls.
       */
      if (
        actionTriggeredRef.current
      ) {

        return;

      }


      actionTriggeredRef.current =
        true;


      emergencyCallbackRef
        .current?.();

    };


  // =========================================
  // HIDE POPUP
  // =========================================

  if (!visible) {

    return null;

  }


  // =========================================
  // POPUP UI
  // =========================================

  return (

    <div className="sos-overlay">


      <div className="sos-popup">


        {/* Emergency Icon */}

        <div className="sos-icon">

          🚨

        </div>



        {/* Heading */}

        <h2>

          Safety Check

        </h2>



        {/* Safety Message */}

        <p>

          NightGuard has detected that
          you have stopped moving.

        </p>


        <p>

          Are you safe?

        </p>



        {/* Countdown Circle */}

        <div className="countdown-circle">

          {countdown}

        </div>



        {/* Countdown Information */}

        <div className="countdown-text">

          Automatic emergency alert in{" "}

          <strong>

            {countdown} seconds

          </strong>

        </div>



        {/* Actions */}

        <div className="sos-buttons">


          {/* I'M SAFE */}

          <button
            type="button"
            className="safe-btn"
            onClick={
              handleSafe
            }
          >

            ✅ I&apos;m Safe

          </button>



          {/* NEED HELP */}

          <button
            type="button"
            className="help-btn"
            onClick={
              handleEmergency
            }
          >

            🚨 Need Help

          </button>


        </div>


      </div>


    </div>

  );

}


export default SOSPopup;