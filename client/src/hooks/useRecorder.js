import { useRef, useState } from 'react';

export function useRecorder() {
  const [state, setState] = useState('idle');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timeoutRef = useRef(null);
  const mimeTypeRef = useRef('audio/webm');

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/mp4';
    mimeTypeRef.current = mimeType;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start();
    setState('recording');
    timeoutRef.current = setTimeout(() => stopAndReturn(), 10000);
  };

  const stopAndReturn = () => {
    clearTimeout(timeoutRef.current);
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') {
        resolve(null);
        return;
      }
      mr.onstop = () => {
        mr.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        setState('idle');
        resolve({ blob, mimeType: mimeTypeRef.current });
      };
      mr.stop();
    });
  };

  const cancel = () => {
    clearTimeout(timeoutRef.current);
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stream.getTracks().forEach((t) => t.stop());
      mr.stop();
    }
    setState('idle');
  };

  return { state, start, stop: stopAndReturn, cancel };
}
