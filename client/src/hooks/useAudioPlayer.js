import { useRef } from 'react';

// One-time unlock: iOS Safari requires audio.play() to be called within a user
// gesture before any async audio playback is allowed.
let audioUnlocked = false;

export function unlockAudio() {
  if (audioUnlocked) return;
  const silence = new Audio(
    'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////'
  );
  silence.play().catch(() => {});
  audioUnlocked = true;
}

export function useAudioPlayer() {
  const currentRef = useRef(null);

  const play = (base64mp3) => {
    if (currentRef.current) {
      currentRef.current.pause();
    }
    const audio = new Audio(`data:audio/mp3;base64,${base64mp3}`);
    currentRef.current = audio;
    audio.play().catch((err) => console.warn('[audio play]', err.message));
    return audio;
  };

  const stop = () => {
    if (currentRef.current) {
      currentRef.current.pause();
      currentRef.current = null;
    }
  };

  return { play, stop };
}
