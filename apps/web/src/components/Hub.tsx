import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleUserRound, MapPin, Mic, Route, RotateCcw, Send, ShieldCheck, Square, Users } from "lucide-react";
import type { ConductorResponse, CoordinationStatus, SeniorProfile, TrustedContact } from "@tap/shared";
import type { AppUser } from "../lib/firebase";
import { buildHubPlan, type PlanTag } from "../lib/hub-plan";
import { readCoordinationStatus, requestConductorPlan, sendContactRequest } from "../lib/conductor";
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
  const [plan, setPlan] = useState<ReturnType<typeof buildHubPlan> | ConductorResponse | null>(null);
  const [planning, setPlanning] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [contactReview, setContactReview] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState("");
  const [coordination, setCoordination] = useState<{ id: string; status: CoordinationStatus; expiresAt: string } | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const trustedContactAvailable = contacts.some((contact) => contact.permissionConfirmed);
  const primaryContact = contacts.find((contact) => contact.isPrimary && contact.permissionConfirmed && contact.canReceiveSms)
    ?? contacts.find((contact) => contact.permissionConfirmed && contact.canReceiveSms);
  const firstName = profile.displayName.trim().split(/\s+/)[0] || user.displayName;
  const conductorPlan = plan && "rankedOptions" in plan ? plan : null;

  useEffect(() => {
    if (!coordination || coordination.status !== "waiting" || user.isDemo) return;
    let stopped = false;
    let checking = false;
    const check = async () => {
      if (checking || stopped) return;
      checking = true;
      try {
        const current = await readCoordinationStatus(user, coordination.id);
        if (!stopped) setCoordination(current);
      } catch {
        if (!stopped) setContactError("TAP could not check the reply. You can try again.");
      } finally { checking = false; }
    };
    const interval = window.setInterval(() => void check(), 3_000);
    const remaining = Math.max(0, new Date(coordination.expiresAt).getTime() - Date.now());
    const timeout = window.setTimeout(() => {
      if (!stopped) setCoordination((current) => current ? { ...current, status: "timed_out" } : current);
    }, remaining);
    void check();
    return () => { stopped = true; window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [coordination?.id, coordination?.status, coordination?.expiresAt, user]);

  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    const previousDirection = document.documentElement.dir;
    document.documentElement.lang = (speechLocales[profile.preferredLanguage] ?? "en-US").split("-")[0];
    document.documentElement.dir = getTextDirection(profile.preferredLanguage);
    return () => {
      recognition.current?.stop();
      document.documentElement.lang = previousLanguage || "en";
      document.documentElement.dir = previousDirection;
    };
  }, [profile.preferredLanguage]);

  function startListening() {
    setMessage("");
    setContactReview(false);
    setContactError("");
    setCoordination(null);
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

  async function askTrustedContact() {
    if (!conductorPlan || !primaryContact || !conductorPlan.contactMessage.draft) return;
    setContactBusy(true);
    setContactError("");
    try {
      const result = await sendContactRequest(user, primaryContact, conductorPlan.contactMessage.draft);
      setCoordination({ id: result.confirmationId, status: result.simulated ? "timed_out" : result.status, expiresAt: result.expiresAt });
    } catch (error) {
      setContactError(error instanceof Error ? error.message : "TAP could not contact this person.");
    } finally { setContactBusy(false); }
  }

  function stopListening() {
    recognition.current?.stop();
    setListening(false);
  }

  async function submitRequest() {
    if (!request.trim()) { setMessage(copy.typeRequest); return; }
    setMessage("");
    setPlanning(true);
    try {
      setPlan(await requestConductorPlan(request.trim(), user, profile, contacts));
    } catch {
      setPlan(buildHubPlan(request, copy, trustedContactAvailable));
      setMessage("The secure conductor is unavailable, so TAP prepared a private on-device fallback plan.");
    } finally {
      setPlanning(false);
    }
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
              <button type="button" className="primary-button" disabled={planning} onClick={() => void submitRequest()}>{planning ? "Preparing…" : copy.makePlan} <Send /></button>
            </div>
            {message && <div className="form-guidance" role="status">{message}</div>}
            <div className="quick-starts"><strong>{copy.quickTitle}</strong><div>{copy.quickRequests.map((item) => <button type="button" key={item} onClick={() => { setRequest(item); setMessage(""); }}>{item} <ArrowRight /></button>)}</div></div>
          </section>
        ) : (
          <section className="plan-result" aria-live="polite">
            <div className="plan-result-head"><div><div className="eyebrow">{copy.planTitle}</div><h2>“{plan.request}”</h2><p>{copy.planIntro}</p></div><button className="secondary-button" onClick={() => { setPlan(null); setRequest(""); setContactReview(false); setCoordination(null); }}>{copy.newRequest}</button></div>
            <ol className="plan-steps">
              {plan.steps.map((step, index) => {
                const Icon = tagIcons[step.tag];
                return <li key={step.tag}><span className={`plan-step-icon ${step.tag}`}><Icon /></span><div><small>{index + 1} · {step.tag}</small><h3>{step.title}</h3><p>{step.detail}</p></div></li>;
              })}
            </ol>
            {"rankedOptions" in plan && plan.rankedOptions.length > 0 && <div className="ranked-options">
              <h3>Best options</h3>
              {plan.rankedOptions.map((option) => <article key={option.place.id}>
                <span className="option-rank">{option.rank}</span>
                <div><strong>{option.place.name}</strong><p>{option.place.address}</p><small>{option.transport.durationMinutes} min · {option.transport.distanceMiles} miles · {option.transport.mode}</small><p>{option.reason}</p></div>
              </article>)}
              <div className="integration-note">Planner: {plan.integrations.intent} · Places: {plan.integrations.places} · Routes: {plan.integrations.routes} · Messages: {plan.integrations.messaging}</div>
            </div>}
            {conductorPlan?.contactMessage.available && primaryContact && <section className="contact-action" aria-live="polite">
              <h3>Ask {primaryContact.name || "your trusted contact"} for help?</h3>
              {!contactReview ? <button className="secondary-button" onClick={() => setContactReview(true)}>Review message</button> : <>
                <p className="message-preview">{conductorPlan.contactMessage.draft}</p>
                {!coordination && <div className="contact-buttons"><button className="secondary-button" onClick={() => setContactReview(false)}>Not now</button><button className="primary-button" disabled={contactBusy} onClick={() => void askTrustedContact()}>{contactBusy ? "Sending…" : "Confirm and send"} <Send /></button></div>}
                {coordination?.status === "waiting" && <div className="coordination-status waiting">Waiting up to two minutes for a YES or NO reply…</div>}
                {coordination?.status === "accepted" && <div className="coordination-status accepted"><Check /> Ride help accepted. TAP will keep this as the primary plan.</div>}
                {coordination && ["declined", "timed_out", "failed"].includes(coordination.status) && <div className="coordination-status fallback"><RotateCcw /> The contact is unavailable. <a href="https://m.uber.com/" target="_blank" rel="noreferrer">Open Uber as the fallback</a>.</div>}
                {contactError && <div className="form-error" role="alert">{contactError}</div>}
              </>}
            </section>}
            <div className="permission-note"><ShieldCheck /><span>{copy.confirmNote}</span></div>
            {message && <div className="form-guidance" role="status">{message}</div>}
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

