import { useEffect, useRef } from "react";

function AlarmSound({
  active = false,
  mode = "timer"
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }

   const audio = new Audio(
  mode === "warning" || mode === "emergency"
    ? "/sounds/warning.mp3"
    : "/sounds/timer.mp3"
);

    audio.loop = true;
    audio.volume = 1.0;

    audio.play().catch((error) => {
      console.error(
        "Unable to play alarm:",
        error
      );
    });

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [active, mode]);

  return null;
}

export default AlarmSound;