import { useState, useCallback } from 'react';
import '../styles/assistant.css';
import { useRecorder } from '../hooks/useRecorder.js';
import { useAudioPlayer, unlockAudio } from '../hooks/useAudioPlayer.js';
import { transcribeAudio, askQuestion } from '../lib/api.js';

const LABELS = {
  ko: {
    idle: { button: '말하기\n(눌러주세요)', status: '' },
    listening: { button: '듣고 있어요\n(누르면 완료)', status: '듣고 있어요...' },
    transcribing: { button: '잠깐만요...', status: '잠깐만요...' },
    answering: { button: '생각 중...', status: '생각 중...' },
    answered: { button: '다시 말하기', status: '' },
    error: { button: '다시 시도', status: '문제가 생겼어요.\n다시 눌러주세요.' },
  },
  en: {
    idle: { button: 'Tap to talk', status: '' },
    listening: { button: 'Listening…\n(tap to finish)', status: 'Listening…' },
    transcribing: { button: 'One moment…', status: 'One moment…' },
    answering: { button: 'Thinking…', status: 'Thinking…' },
    answered: { button: 'Ask again', status: '' },
    error: { button: 'Try again', status: 'Something went wrong.\nTap to try again.' },
  },
};

function useLang() {
  const [lang, setLang] = useState(() => localStorage.getItem('testLanguage') || 'ko');
  const toggle = () => {
    const next = lang === 'ko' ? 'en' : 'ko';
    localStorage.setItem('testLanguage', next);
    setLang(next);
  };
  return [lang, toggle];
}

export default function AssistantView() {
  const [uiState, setUiState] = useState('idle');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [lang, toggleLang] = useLang();
  const recorder = useRecorder();
  const player = useAudioPlayer();

  const labels = LABELS[lang];

  const handleTap = useCallback(async () => {
    unlockAudio();

    if (uiState === 'idle') {
      setQuestion('');
      setAnswer('');
      try {
        await recorder.start();
        setUiState('listening');
      } catch {
        setUiState('error');
      }
      return;
    }

    if (uiState === 'listening') {
      try {
        const result = await recorder.stop();
        if (!result) { setUiState('error'); return; }
        setUiState('transcribing');

        const { transcription } = await transcribeAudio(result.blob, result.mimeType, lang);
        setQuestion(transcription);
        setUiState('answering');

        const { answer: ans, audioBase64, audioError } = await askQuestion(transcription, lang);
        setAnswer(ans);
        setUiState('answered');
        if (audioBase64 && !audioError) player.play(audioBase64);
      } catch (err) {
        console.error(err);
        recorder.cancel();
        setUiState('error');
      }
      return;
    }

    if (uiState === 'answered' || uiState === 'error') {
      player.stop();
      setUiState('idle');
      setQuestion('');
      setAnswer('');
    }
  }, [uiState, recorder, player, lang]);

  const isProcessing = uiState === 'transcribing' || uiState === 'answering';

  return (
    <div className="assistant-root">
      <button
        className="lang-switch"
        onClick={toggleLang}
        aria-label="Switch language"
      >
        {lang === 'ko' ? '🇰🇷' : '🇺🇸'}
      </button>

      {uiState === 'answered' && question && (
        <p className="question-text">{question}</p>
      )}

      {uiState === 'answered' && answer && (
        <p className="answer-text">{answer}</p>
      )}

      {uiState === 'error' && (
        <p className="error-text">
          {labels.error.status.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
        </p>
      )}

      {(uiState === 'listening' || uiState === 'transcribing' || uiState === 'answering') &&
        !answer && (
          <p className="status-text">{labels[uiState].status}</p>
        )}

      <button
        className={`talk-button ${uiState === 'listening' ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={handleTap}
        disabled={isProcessing}
        aria-label={lang === 'ko' ? '말하기 버튼' : 'Talk button'}
      >
        {labels[uiState].button.split('\n').map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </button>
    </div>
  );
}
