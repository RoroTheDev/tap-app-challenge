import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleUserRound, MapPin, Mic, Send, Square, Users } from "lucide-react";
import type { SeniorProfile, TrustedContact } from "@tap/shared";
import type { AppUser } from "../lib/firebase";
import { getHubCopy, getTextDirection, speechLocales } from "../lib/localization";
import { AccessibilityControls } from "./AccessibilityControls";
import { Logo } from "./Logo";

interface SpeechRecognitionResultLike { 0: { transcript: string }; isFinal?: boolean; }
interface SpeechRecognitionEventLike { resultIndex?: number; results: ArrayLike<SpeechRecognitionResultLike>; }
interface SpeechRecognitionErrorLike { error: string; }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor() {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

interface HubProps {
  user: AppUser;
  profile: SeniorProfile;
  contacts: TrustedContact[];
  onEdit: () => void;
  onLogout: () => void;
  onDelete: () => Promise<void>;
  onStartPlan: (request: string) => void;
}

export function Hub({ user, profile, contacts, onEdit, onLogout, onDelete, onStartPlan }: HubProps) {
  const copy = useMemo(() => getHubCopy(profile.preferredLanguage), [profile.preferredLanguage]);
  const [request, setRequest] = useState("");
  const [listening, setListening] = useState(false);
  const [startingVoice, setStartingVoice] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const recognitionSession = useRef(0);
  const speechBase = useRef("");
  const speechSegments = useRef<string[]>([]);
  const firstName = profile.displayName.trim().split(/\s+/)[0] || user.displayName;

  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.documentElement.lang = (speechLocales[profile.preferredLanguage] ?? navigator.language ?? "en-US").split("-")[0];
    document.documentElement.dir = getTextDirection(profile.preferredLanguage);
    return () => {
      recognitionSession.current += 1;
      recognition.current?.abort?.();
      recognition.current = null;
      document.documentElement.lang = previousLanguage || "en";
      document.documentElement.dir = previousDirection;
    };
  }, [profile.preferredLanguage]);

  function voiceErrorMessage(code: string) {
    if (code === "not-allowed" || code === "service-not-allowed") return copy.voicePermission;
    if (code === "no-speech") return copy.voiceNoSpeech;
    if (code === "audio-capture") return copy.voiceMicrophone;
    if (code === "network") return copy.voiceNetwork;
    return copy.voiceError;
  }

  async function startListening() {
    setMessage("");
    const Recognition = recognitionConstructor();
    if (!Recognition) { setMessage(copy.voiceUnavailable); return; }
    const session = ++recognitionSession.current;
    setStartingVoice(true);
    setMessage(copy.voiceStarting);
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        permissionStream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        if (session !== recognitionSession.current) return;
        const name = error instanceof DOMException ? error.name : "";
        setMessage(name === "NotAllowedError" || name === "SecurityError" ? copy.voicePermission : copy.voiceMicrophone);
        setStartingVoice(false);
        return;
      }
    }
    if (session !== recognitionSession.current) return;
    recognition.current?.abort?.();
    const nextRecognition = new Recognition();
    recognition.current = nextRecognition;
    speechBase.current = request.trim();
    speechSegments.current = [];
    let heardSpeech = false;
    let failed = false;
    nextRecognition.lang = speechLocales[profile.preferredLanguage] ?? navigator.language ?? "en-US";
    nextRecognition.continuous = false;
    nextRecognition.interimResults = true;
    nextRecognition.maxAlternatives = 1;
    nextRecognition.onstart = () => {
      if (session !== recognitionSession.current) return;
      setStartingVoice(false);
      setListening(true);
      setMessage("");
    };
    nextRecognition.onend = () => {
      if (session !== recognitionSession.current) return;
      recognition.current = null;
      setStartingVoice(false);
      setListening(false);
      if (!heardSpeech && !failed) setMessage(copy.voiceNoSpeech);
    };
    nextRecognition.onerror = (event) => {
      if (session !== recognitionSession.current || event.error === "aborted") return;
      failed = true;
      setStartingVoice(false);
      setListening(false);
      setMessage(voiceErrorMessage(event.error));
    };
    nextRecognition.onresult = (event) => {
      if (session !== recognitionSession.current) return;
      for (let index = event.resultIndex ?? 0; index < event.results.length; index += 1) {
        speechSegments.current[index] = event.results[index]?.[0]?.transcript?.trim() ?? "";
      }
      const transcript = speechSegments.current.filter(Boolean).join(" ").trim();
      if (!transcript) return;
      heardSpeech = true;
      setRequest([speechBase.current, transcript].filter(Boolean).join(" "));
      setMessage("");
    };
    try {
      nextRecognition.start();
    } catch {
      failed = true;
      setStartingVoice(false);
      setListening(false);
      setMessage(copy.voiceError);
    }
  }

  function stopListening() {
    recognition.current?.stop();
  }

  function submitRequest() {
    if (!request.trim()) { setMessage(copy.typeRequest); return; }
    setMessage("");
    onStartPlan(request.trim());
  }

  async function deleteData() {
    setDeleting(true);
    setDeleteError("");
    try { await onDelete(); } catch { setDeleteError(copy.deleteError); } finally { setDeleting(false); }
  }

  return (
    <div className="hub-shell" dir={getTextDirection(profile.preferredLanguage)}>
      <header className="hub-header">
        <Logo />
        <div className="hub-account">
          <AccessibilityControls language={profile.preferredLanguage} readTargetId="tap-hub-main" />
          <span>{profile.preferredLanguage}</span>
          <button className="nav-link" onClick={onEdit}><CircleUserRound /> {copy.editProfile}</button>
          <button className="nav-link" onClick={onLogout}>{copy.logout}</button>
        </div>
      </header>

      <main className="hub-main" id="tap-hub-main">
        <section className="hub-welcome">
          <div className="eyebrow"><Check /> {copy.profileReady}</div>
          <h1>{copy.greeting}, {firstName}.</h1>
          <p>{copy.subtitle}</p>
        </section>

          <section className="request-card">
            <div className="request-heading"><div><h2>{copy.askTitle}</h2><p>{copy.askBody}</p></div><span className="voice-language"><Mic /> {profile.preferredLanguage}</span></div>
            <label className="sr-only" htmlFor="tap-request">{copy.askTitle}</label>
            <textarea id="tap-request" value={request} onChange={(event) => setRequest(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") submitRequest(); }} placeholder={copy.placeholder} maxLength={500} />
            <div className="request-actions">
              <button type="button" className={`voice-button ${listening ? "listening" : ""}`} disabled={startingVoice} onClick={listening ? stopListening : () => void startListening()} aria-pressed={listening}>
                {listening ? <Square /> : <Mic />} {startingVoice ? copy.voiceStarting : listening ? copy.stop : copy.listen}
              </button>
              <button type="button" className="primary-button" onClick={submitRequest}>{copy.makePlan} <Send /></button>
            </div>
            {message && <div className="form-guidance" role="status">{message}</div>}
            <p className="keyboard-hint">Tip: press Ctrl + Enter to make your plan.</p>
            <div className="quick-starts"><strong>{copy.quickTitle}</strong><div>{copy.quickRequests.map((item) => <button type="button" key={item} onClick={() => onStartPlan(item)}>{item} <ArrowRight /></button>)}</div></div>
          </section>

        <section className="hub-profile-note">
          <span><MapPin /> {profile.city}, {profile.state}</span>
          <span><Users /> {contacts.length} {contacts.length === 1 ? copy.trustedOne : copy.trustedMany}</span>
          {!confirmingDelete ? <button className="text-button danger" onClick={() => setConfirmingDelete(true)}>{copy.deleteData}</button> : <div className="inline-delete"><span>{copy.deleteQuestion}</span><button className="secondary-button" onClick={() => setConfirmingDelete(false)}>{copy.cancel}</button><button className="danger-button" disabled={deleting} onClick={() => void deleteData()}>{deleting ? copy.deleting : copy.delete}</button>{deleteError && <span className="form-error" role="alert">{deleteError}</span>}</div>}
        </section>
      </main>
    </div>
  );
}

