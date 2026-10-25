import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleUserRound, MapPin, Mic, Route, RotateCcw, Send, ShieldCheck, Square, Users } from "lucide-react";
import type { SeniorProfile, TrustedContact } from "@tap/shared";
import type { AppUser } from "../lib/firebase";
import { buildHubPlan, type PlanTag } from "../lib/hub-plan";
import { getHubCopy, getTextDirection, speechLocales } from "../lib/localization";
import { Logo } from "./Logo";

interface SpeechRecognitionResultLike { 0: { transcript: string }; }
interface SpeechRecognitionEventLike { results: ArrayLike<SpeechRecognitionResultLike>; }
interface SpeechRecognitionErrorLike { error: string; }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor() {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

const tagIcons: Record<PlanTag, typeof MapPin> = {
  places: MapPin,
  transport: Route,
  contact: Users,
  fallback: RotateCcw,
};

interface HubProps {
  user: AppUser;
  profile: SeniorProfile;
  contacts: TrustedContact[];
  onEdit: () => void;
  onLogout: () => void;
  onDelete: () => Promise<void>;
}

export function Hub({ user, profile, contacts, onEdit, onLogout, onDelete }: HubProps) {
  const copy = useMemo(() => getHubCopy(profile.preferredLanguage), [profile.preferredLanguage]);
  const [request, setRequest] = useState("");
  const [plan, setPlan] = useState<ReturnType<typeof buildHubPlan> | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const trustedContactAvailable = contacts.some((contact) => contact.permissionConfirmed);
  const firstName = profile.displayName.trim().split(/\s+/)[0] || user.displayName;

  function startListening() {
    setMessage("");
    const Recognition = recognitionConstructor();
    if (!Recognition) { setMessage(copy.voiceUnavailable); return; }
    const nextRecognition = new Recognition();
    recognition.current = nextRecognition;
    nextRecognition.lang = speechLocales[profile.preferredLanguage] ?? navigator.language ?? "en-US";
    nextRecognition.continuous = false;
    nextRecognition.interimResults = false;
    nextRecognition.onstart = () => setListening(true);
    nextRecognition.onend = () => setListening(false);
    nextRecognition.onerror = () => { setListening(false); setMessage(copy.voiceError); };
    nextRecognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) setRequest(transcript);
    };
    try { nextRecognition.start(); } catch { setMessage(copy.voiceError); }
  }

  function stopListening() {
    recognition.current?.stop();
    setListening(false);
  }

  function submitRequest() {
    if (!request.trim()) { setMessage(copy.typeRequest); return; }
    setMessage("");
    setPlan(buildHubPlan(request, copy, trustedContactAvailable));
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
          <span>{profile.preferredLanguage}</span>
          <button className="nav-link" onClick={onEdit}><CircleUserRound /> {copy.editProfile}</button>
          <button className="nav-link" onClick={onLogout}>{copy.logout}</button>
        </div>
      </header>

      <main className="hub-main">
        <section className="hub-welcome">
          <div className="eyebrow"><Check /> {copy.profileReady}</div>
          <h1>{copy.greeting}, {firstName}.</h1>
          <p>{copy.subtitle}</p>
        </section>

        {!plan ? (
          <section className="request-card">
            <div className="request-heading"><div><h2>{copy.askTitle}</h2><p>{copy.askBody}</p></div><span className="voice-language"><Mic /> {profile.preferredLanguage}</span></div>
            <label className="sr-only" htmlFor="tap-request">{copy.askTitle}</label>
            <textarea id="tap-request" value={request} onChange={(event) => setRequest(event.target.value)} placeholder={copy.placeholder} maxLength={500} />
            <div className="request-actions">
              <button type="button" className={`voice-button ${listening ? "listening" : ""}`} onClick={listening ? stopListening : startListening} aria-pressed={listening}>
                {listening ? <Square /> : <Mic />} {listening ? copy.stop : copy.listen}
              </button>
              <button type="button" className="primary-button" onClick={submitRequest}>{copy.makePlan} <Send /></button>
            </div>
            {message && <div className="form-guidance" role="status">{message}</div>}
            <div className="quick-starts"><strong>{copy.quickTitle}</strong><div>{copy.quickRequests.map((item) => <button type="button" key={item} onClick={() => { setRequest(item); setMessage(""); }}>{item} <ArrowRight /></button>)}</div></div>
          </section>
        ) : (
          <section className="plan-result" aria-live="polite">
            <div className="plan-result-head"><div><div className="eyebrow">{copy.planTitle}</div><h2>“{plan.request}”</h2><p>{copy.planIntro}</p></div><button className="secondary-button" onClick={() => { setPlan(null); setRequest(""); }}>{copy.newRequest}</button></div>
            <ol className="plan-steps">
              {plan.steps.map((step, index) => {
                const Icon = tagIcons[step.tag];
                return <li key={step.tag}><span className={`plan-step-icon ${step.tag}`}><Icon /></span><div><small>{index + 1} · {step.tag}</small><h3>{step.title}</h3><p>{step.detail}</p></div></li>;
              })}
            </ol>
            <div className="permission-note"><ShieldCheck /><span>{copy.confirmNote}</span></div>
          </section>
        )}

        <section className="hub-profile-note">
          <span><MapPin /> {profile.city}, {profile.state}</span>
          <span><Users /> {contacts.length} {contacts.length === 1 ? copy.trustedOne : copy.trustedMany}</span>
          {!confirmingDelete ? <button className="text-button danger" onClick={() => setConfirmingDelete(true)}>{copy.deleteData}</button> : <div className="inline-delete"><span>{copy.deleteQuestion}</span><button className="secondary-button" onClick={() => setConfirmingDelete(false)}>{copy.cancel}</button><button className="danger-button" disabled={deleting} onClick={() => void deleteData()}>{deleting ? copy.deleting : copy.delete}</button>{deleteError && <span className="form-error" role="alert">{deleteError}</span>}</div>}
        </section>
      </main>
    </div>
  );
}

