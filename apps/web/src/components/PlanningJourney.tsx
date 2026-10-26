import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Circle, Clock3, MapPin, MessageCircle, Navigation, RotateCcw, Send, Sparkles } from "lucide-react";
import type { ConductorResponse, CoordinationStatus, SeniorProfile, TrustedContact } from "@tap/shared";
import type { AppUser } from "../lib/firebase";
import { readCoordinationStatus, requestConductorPlan, sendContactRequest } from "../lib/conductor";
import { activePlanBranch, getFeatureDefinition, getPhaseLabel, type PlanningPhase } from "../lib/workflow";
import { Logo } from "./Logo";

interface PlanningJourneyProps {
  request: string;
  user: AppUser;
  profile: SeniorProfile;
  contacts: TrustedContact[];
  onClose: () => void;
}

const phases: PlanningPhase[] = ["understanding", "discovering", "transport", "fallbacks", "ready"];

export function PlanningJourney({ request, user, profile, contacts, onClose }: PlanningJourneyProps) {
  const [phase, setPhase] = useState<PlanningPhase>("understanding");
  const [plan, setPlan] = useState<ConductorResponse | null>(null);
  const [error, setError] = useState("");
  const [contactReview, setContactReview] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState("");
  const [coordination, setCoordination] = useState<{ id: string; status: CoordinationStatus; expiresAt: string } | null>(null);
  const primaryContact = contacts.find((contact) => contact.isPrimary && contact.permissionConfirmed && contact.canReceiveSms)
    ?? contacts.find((contact) => contact.permissionConfirmed && contact.canReceiveSms);
  const needsContact = Boolean(plan?.intent.tags.includes("contact") && plan.contactMessage.available && primaryContact);
  const branch = activePlanBranch(needsContact, coordination?.status);
  const feature = getFeatureDefinition(plan?.intent.category);

  useEffect(() => {
    let stopped = false;
    const timers = [
      window.setTimeout(() => !stopped && setPhase("discovering"), 650),
      window.setTimeout(() => !stopped && setPhase("transport"), 1_500),
      window.setTimeout(() => !stopped && setPhase("fallbacks"), 2_400),
    ];
    void requestConductorPlan(request, user, profile, contacts).then((result) => {
      if (stopped) return;
      setPlan(result);
      setPhase("ready");
    }).catch((reason) => {
      if (!stopped) setError(reason instanceof Error ? reason.message : "TAP could not prepare this plan.");
    });
    return () => { stopped = true; timers.forEach(window.clearTimeout); };
  }, [request, user, profile, contacts]);

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
        if (!stopped) setContactError("TAP could not check the reply. Your backup plan is still ready.");
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

  const currentPhaseIndex = phases.indexOf(phase);
  const statusText = useMemo(() => getPhaseLabel(phase, plan?.intent.category), [phase, plan?.intent.category]);

  async function askTrustedContact() {
    if (!plan || !primaryContact || !plan.contactMessage.draft) return;
    setContactBusy(true);
    setContactError("");
    try {
      const result = await sendContactRequest(user, primaryContact, plan.contactMessage.draft);
      setCoordination({ id: result.confirmationId, status: result.simulated ? "timed_out" : result.status, expiresAt: result.expiresAt });
    } catch (reason) {
      setContactError(reason instanceof Error ? reason.message : "TAP could not contact this person.");
      setCoordination({ id: "failed", status: "failed", expiresAt: new Date().toISOString() });
    } finally { setContactBusy(false); }
  }

  return (
    <div className="journey-shell">
      <header className="journey-header"><Logo /><button className="nav-link" onClick={onClose}><ArrowLeft /> Back to TAP</button></header>
      <main className="journey-main" aria-live="polite">
        <div className="journey-intro">
          <div className="eyebrow"><Sparkles /> TAP CONDUCTOR</div>
          <h1>{plan ? feature.label : "Building your plan"}</h1>
          <p>“{request}”</p>
        </div>

        <ol className="journey-progress" aria-label="Planning progress">
          {phases.map((item, index) => <li key={item} className={index < currentPhaseIndex ? "complete" : index === currentPhaseIndex ? "active" : "pending"}>
            <span>{index < currentPhaseIndex || phase === "ready" ? <Check /> : index === currentPhaseIndex ? <span className="pulse-dot" /> : <Circle />}</span>
            <strong>{getPhaseLabel(item, plan?.intent.category)}</strong>
          </li>)}
        </ol>

        {!plan && !error && <section className="journey-loading"><div className="conductor-orbit"><Sparkles /><i /><i /><i /></div><h2>{statusText}…</h2><p>TAP is working on the primary plan and its backups at the same time.</p></section>}
        {error && <section className="journey-error"><h2>We couldn’t finish this plan</h2><p>{error}</p><button className="primary-button" onClick={onClose}>Try another request</button></section>}

        {plan && <section className="decision-area">
          <div className="decision-heading"><div><span>LIVE DECISION TREE</span><h2>{feature.resultLabel}</h2></div><small>Backups stay ready until the plan is complete.</small></div>
          <div className="decision-tree">
            <article className={`decision-node primary ${branch === "primary" ? "selected" : ""}`}>
              <div className="node-top"><span className="node-letter">A</span><span className="node-state">{branch === "primary" ? "Selected plan" : "Primary option"}</span></div>
              {plan.rankedOptions[0] ? <><h3>{plan.rankedOptions[0].place.name}</h3><p><MapPin /> {plan.rankedOptions[0].place.address}</p><p><Navigation /> {plan.rankedOptions[0].transport.durationMinutes} minutes · {plan.rankedOptions[0].transport.distanceMiles} miles</p><small>{plan.rankedOptions[0].reason}</small></> : <p>TAP found no matching place yet.</p>}
              {!needsContact && <div className="node-confirmed"><Check /> Ready to go</div>}
              {needsContact && branch === "primary" && <div className="node-confirmed"><Check /> Help accepted — Plan A is confirmed</div>}
            </article>

            {needsContact && <article className={`decision-node contact ${branch === "coordination" ? "selected" : ""}`}>
              <div className="tree-connector">if help is needed</div>
              <div className="node-top"><MessageCircle /><span className="node-state">Trusted contact checkpoint</span></div>
              <h3>Ask {primaryContact?.name || "your trusted contact"}?</h3>
              {!contactReview && !coordination && <button className="primary-button" onClick={() => setContactReview(true)}>Review and continue</button>}
              {contactReview && !coordination && <><p className="message-preview">{plan.contactMessage.draft}</p><div className="contact-buttons"><button className="secondary-button" onClick={() => setContactReview(false)}>Not now</button><button className="primary-button" disabled={contactBusy} onClick={() => void askTrustedContact()}>{contactBusy ? "Sending…" : "Confirm and send"} <Send /></button></div></>}
              {coordination?.status === "waiting" && <div className="coordination-status waiting"><Clock3 /> Waiting up to two minutes for YES or NO…</div>}
              {coordination?.status === "accepted" && <div className="coordination-status accepted"><Check /> Accepted — continuing with Plan A.</div>}
              {coordination && ["declined", "timed_out", "failed"].includes(coordination.status) && <div className="coordination-status fallback"><RotateCcw /> {coordination.status === "declined" ? "They aren’t available." : coordination.status === "timed_out" ? "No reply arrived in time." : "The message could not be delivered."} TAP activated Plan B.</div>}
              {contactError && <div className="form-error" role="alert">{contactError}</div>}
            </article>}

            <article className={`decision-node backup ${branch === "fallback" ? "selected" : ""}`}>
              <div className="tree-connector">if Plan A cannot continue</div>
              <div className="node-top"><span className="node-letter">B</span><span className="node-state">{branch === "fallback" ? "Active fallback" : "Ready in the background"}</span></div>
              <h3>Independent ride option</h3><p>Use a rideshare while keeping the same destination.</p>
              {branch === "fallback" && <a className="primary-button link-button" href="https://m.uber.com/" target="_blank" rel="noreferrer">Open Uber <Navigation /></a>}
            </article>

            <article className="decision-node reserve">
              <div className="tree-connector">if Plan B is not right</div>
              <div className="node-top"><span className="node-letter">C</span><span className="node-state">Reserve options</span></div>
              <h3>Other ways to complete the goal</h3>
              <ul>{plan.fallbackOptions.map((option) => <li key={option}>{option}</li>)}</ul>
            </article>
          </div>
          {plan.rankedOptions.length > 1 && <section className="alternate-results"><h3>Other {plan.intent.category === "activity" ? "activities" : "nearby options"}</h3><div>{plan.rankedOptions.slice(1).map((option) => <article key={option.place.id}><strong>#{option.rank} {option.place.name}</strong><span>{option.transport.durationMinutes} min · {option.transport.distanceMiles} miles</span></article>)}</div></section>}
          <div className="journey-actions"><button className="secondary-button" onClick={onClose}>Start a new request</button></div>
        </section>}
      </main>
    </div>
  );
}
