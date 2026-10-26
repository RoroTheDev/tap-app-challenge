import { useEffect, useState } from "react";
import { Type, Volume2, VolumeX } from "lucide-react";
import { speechLocales } from "../lib/localization";

const LARGE_TEXT_KEY = "tap.large-text";

interface AccessibilityControlsProps {
  language: string;
  readTargetId: string;
}

export function AccessibilityControls({ language, readTargetId }: AccessibilityControlsProps) {
  const [largeText, setLargeText] = useState(() => localStorage.getItem(LARGE_TEXT_KEY) === "true");
  const [speaking, setSpeaking] = useState(false);
  const canReadAloud = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  useEffect(() => {
    document.documentElement.classList.toggle("tap-large-text", largeText);
    localStorage.setItem(LARGE_TEXT_KEY, String(largeText));
    return () => window.speechSynthesis?.cancel();
  }, [largeText]);

  function toggleReading() {
    if (!canReadAloud) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const text = document.getElementById(readTargetId)?.innerText.trim();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocales[language] ?? navigator.language ?? "en-US";
    utterance.rate = 0.88;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <div className="accessibility-controls" aria-label="Accessibility tools">
      <button type="button" className="accessibility-button" aria-pressed={largeText} onClick={() => setLargeText((current) => !current)}>
        <Type /> {largeText ? "Standard text" : "Larger text"}
      </button>
      {canReadAloud && <button type="button" className="accessibility-button" aria-pressed={speaking} onClick={toggleReading}>
        {speaking ? <VolumeX /> : <Volume2 />} {speaking ? "Stop reading" : "Read page aloud"}
      </button>}
    </div>
  );
}
