import { useEffect, useMemo, useState } from "react";
import { Accessibility, ArrowLeft, CalendarDays, Check, Circle, Clock3, MapPin, MessageCircle, Navigation, RotateCcw, Send, Sparkles, Ticket } from "lucide-react";
import type { ConductorResponse, CoordinationStatus, SeniorProfile, TrustedContact } from "@tap/shared";
import type { AppUser } from "../lib/firebase";
import { createPlanningSession, readCoordinationStatus, readPlanningSession, requestConductorPlan, sendContactRequest, updatePlanningSession } from "../lib/conductor";
import { activePlanBranch, getFeatureDefinition, getPhaseLabel, type PlanningPhase } from "../lib/workflow";
import { buildUberDeepLink } from "../lib/uber";
import { AccessibilityControls } from "./AccessibilityControls";
import { Logo } from "./Logo";

interface PlanningJourneyProps {
  sessionId: string;
  request: string;
  user: AppUser;
  profile: SeniorProfile;
  contacts: TrustedContact[];
  onClose: () => void;
}

const phases: PlanningPhase[] = ["understanding", "discovering", "transport", "fallbacks", "ready"];

export function PlanningJourney({ sessionId, request, user, profile, contacts, onClose }: PlanningJourneyProps) {
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
  const primaryActivity = plan?.activities.find((activity) => activity.venue.id === plan.rankedOptions[0]?.place.id);
  const uberLink = buildUberDeepLink(import.meta.env.VITE_UBER_CLIENT_ID as string | undefined, plan?.rankedOptions[0]?.place);

  useEffect(() => {
    let stopped = false;
    const savePhase = (nextPhase: PlanningPhase) => {
      if (stopped) return;
      setPhase(nextPhase);
      void updatePlanningSession(user, sessionId, { phase: nextPhase }).catch(() => undefined);
    };
    const timers = [
      window.setTimeout(() => savePhase("discovering"), 650),
      window.setTimeout(() => savePhase("transport"), 1_500),
      window.setTimeout(() => savePhase("fallbacks"), 2_400),
    ];
    void (async () => {
      try {
        const existing = await readPlanningSession(user, sessionId);
        if (existing?.plan) {
          timers.forEach(window.clearTimeout);
          if (!stopped) {
            setPlan(existing.plan);
            setPhase("ready");
            if (existing.coordinationStatus) setCoordination({
              id: existing.coordinationId ?? "restored-coordination",
              status: existing.coordinationStatus,
              expiresAt: existing.coordinationExpiresAt ?? new Date().toISOString(),
            });
          }
          return;
        }
        if (!existing) await createPlanningSession(user, sessionId, request);
        const result = await requestConductorPlan(request, user, profile, contacts);
        if (stopped) return;
        timers.forEach(window.clearTimeout);
        setPlan(result);
        setPhase("ready");
        await updatePlanningSession(user, sessionId, { phase: "ready", status: "ready", plan: result }).catch(() => undefined);
      } catch (reason) {
        if (!stopped) {
          setError(reason instanceof Error ? reason.message : "TAP could not prepare this plan.");
          void updatePlanningSession(user, sessionId, { status: "failed" }).catch(() => undefined);
        }
      }
    })();
    return () => { stopped = true; timers.forEach(window.clearTimeout); };
  }, [sessionId, request, user, profile, contacts]);

  useEffect(() => {
    if (!coordination || coordination.status !== "waiting" || user.isDemo) return;
    let stopped = false;
    let checking = false;
    const check = async () => {
      if (checking || stopped) return;
      checking = true;
      try {
        const current = await readCoordinationStatus(user, coordination.id);
        if (!stopped) {
          setCoordination(current);
          const fallback = ["declined", "timed_out", "failed"].includes(current.status);
          void updatePlanningSession(user, sessionId, {
            coordinationStatus: current.status,
            status: current.status === "accepted" ? "accepted" : fallback ? "fallback" : "waiting_for_contact",
            selectedOptionRank: current.status === "accepted" ? 1 : fallback ? 2 : null,
          }).catch(() => undefined);
        }
      } catch {
        if (!stopped) setContactError("TAP could not check the reply. Your backup plan is still ready.");
      } finally { checking = false; }
    };
    const interval = window.setInterval(() => void check(), 3_000);
    const remaining = Math.max(0, new Date(coordination.expiresAt).getTime() - Date.now());
    const timeout = window.setTimeout(() => {
      if (!stopped) {
        setCoordination((current) => current ? { ...current, status: "timed_out" } : current);
        void updatePlanningSession(user, sessionId, { coordinationStatus: "timed_out", status: "fallback", selectedOptionRank: 2 }).catch(() => undefined);
      }
    }, remaining);
    void check();
    return () => { stopped = true; window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [coordination?.id, coordination?.status, coordination?.expiresAt, sessionId, user]);

  const currentPhaseIndex = phases.indexOf(phase);
  const statusText = useMemo(() => getPhaseLabel(phase, plan?.intent.category), [phase, plan?.intent.category]);

  async function askTrustedContact() {
    if (!plan || !primaryContact || !plan.contactMessage.draft) return;
    setContactBusy(true);
    setContactError("");
    try {
      const result = await sendContactRequest(user, primaryContact, plan.contactMessage.draft);
      setCoordination({ id: result.confirmationId, status: result.simulated ? "timed_out" : result.status, expiresAt: result.expiresAt });
      await updatePlanningSession(user, sessionId, {
        status: result.simulated ? "fallback" : "waiting_for_contact",
        coordinationStatus: result.simulated ? "timed_out" : result.status,
        coordinationId: result.confirmationId,
        coordinationExpiresAt: result.expiresAt,
      });
    } catch (reason) {
      setContactError(reason instanceof Error ? reason.message : "TAP could not contact this person.");
      setCoordination({ id: "failed", status: "failed", expiresAt: new Date().toISOString() });
      void updatePlanningSession(user, sessionId, { coordinationStatus: "failed", status: "fallback", selectedOptionRank: 2 }).catch(() => undefined);
    } finally { setContactBusy(false); }
  }

  function useBackupInstead() {
    setContactReview(false);
    setCoordination({ id: "manual-fallback", status: "declined", expiresAt: new Date().toISOString() });
    void updatePlanningSession(user, sessionId, { coordinationStatus: "declined", coordinationId: "manual-fallback", coordinationExpiresAt: new Date().toISOString(), status: "fallback", selectedOptionRank: 2 }).catch(() => undefined);
  }

  return (
    <div className="journey-shell">
      <header className="journey-header"><Logo /><div className="journey-header-actions"><AccessibilityControls language={profile.preferredLanguage} readTargetId="tap-journey-main" /><button className="nav-link" onClick={onClose}><ArrowLeft /> Back to TAP</button></div></header>
      <main className="journey-main" id="tap-journey-main" aria-live="polite">
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
          <div className="next-step-banner">
            <span>YOUR NEXT STEP</span>
            <strong>{branch === "coordination" ? `Ask ${primaryContact?.name || "your trusted contact"} if they can help.` : branch === "fallback" ? "Use the independent ride option below." : "Review the route and go when you are ready."}</strong>
          </div>
          <div className="decision-tree">
            <article className={`decision-node primary ${branch === "primary" ? "selected" : ""}`}>
              <div className="node-top"><span className="node-letter">A</span><span className="node-state">{branch === "primary" ? "Selected plan" : "Primary option"}</span></div>
              {plan.rankedOptions[0] ? <>
                <h3>{primaryActivity?.title ?? plan.rankedOptions[0].place.name}</h3>
                {primaryActivity && <p><CalendarDays /> {primaryActivity.startLabel}</p>}
                <p><MapPin /> {primaryActivity ? `${primaryActivity.venue.name} · ${primaryActivity.venue.address}` : plan.rankedOptions[0].place.address}</p>
                <p><Navigation /> {plan.rankedOptions[0].transport.durationMinutes} minutes · {plan.rankedOptions[0].transport.distanceMiles} miles</p>
                {primaryActivity && <><p><Ticket /> {primaryActivity.costLabel}</p><p><Accessibility /> {primaryActivity.accessibilityLabel}</p>{primaryActivity.registrationUrl && <a className="event-link" href={primaryActivity.registrationUrl} target="_blank" rel="noreferrer">View official details</a>}</>}
                {primaryActivity && <span className="source-freshness"><Check /> {primaryActivity.source === "ticketmaster" ? "Live Ticketmaster listing" : "Verified local senior program"} · checked {new Date(primaryActivity.lastVerifiedAt).toLocaleDateString()}</span>}
                <small>{plan.rankedOptions[0].reason}</small>
                <div className="primary-plan-actions"><strong>{branch === "coordination" ? "Preview the route" : "Route ready"}</strong><a className="primary-button link-button" href={plan.rankedOptions[0].place.mapsUrl} target="_blank" rel="noreferrer">Open directions <Navigation /></a></div>
              </> : <p>TAP found no matching place yet.</p>}
              {!needsContact && <div className="node-confirmed"><Check /> Ready to go</div>}
              {needsContact && branch === "primary" && <div className="node-confirmed"><Check /> Help accepted — Plan A is confirmed</div>}
            </article>

            {needsContact && <article className={`decision-node contact ${branch === "coordination" ? "selected" : ""}`}>
              <div className="tree-connector">if help is needed</div>
              <div className="node-top"><MessageCircle /><span className="node-state">Trusted contact checkpoint</span></div>
              <h3>Ask {primaryContact?.name || "your trusted contact"}?</h3>
              {!contactReview && !coordination && <button className="primary-button" onClick={() => setContactReview(true)}>Review and continue</button>}
              {contactReview && !coordination && <><p className="message-preview">{plan.contactMessage.draft}</p><div className="contact-buttons"><button className="secondary-button" onClick={useBackupInstead}>Use backup instead</button><button className="primary-button" disabled={contactBusy} onClick={() => void askTrustedContact()}>{contactBusy ? "Sending…" : "Confirm and send"} <Send /></button></div></>}
              {coordination?.status === "waiting" && <div className="coordination-status waiting"><Clock3 /> Waiting up to two minutes for YES or NO…</div>}
              {coordination?.status === "accepted" && <div className="coordination-status accepted"><Check /> Accepted — continuing with Plan A.</div>}
              {coordination && ["declined", "timed_out", "failed"].includes(coordination.status) && <div className="coordination-status fallback"><RotateCcw /> {coordination.id === "manual-fallback" ? "You chose the backup." : coordination.status === "declined" ? "They aren’t available." : coordination.status === "timed_out" ? "No reply arrived in time." : "The message could not be delivered."} TAP activated Plan B.</div>}
              {contactError && <div className="form-error" role="alert">{contactError}</div>}
            </article>}

            <article className={`decision-node backup ${branch === "fallback" ? "selected" : ""}`}>
              <div className="tree-connector">if Plan A cannot continue</div>
              <div className="node-top"><span className="node-letter">B</span><span className="node-state">{branch === "fallback" ? "Active fallback" : "Ready in the background"}</span></div>
              <h3>Independent ride option</h3><p>Use a rideshare while keeping the same destination.</p>
              {branch === "fallback" && <a className="primary-button link-button" href={uberLink} target="_blank" rel="noreferrer">Open Uber with destination <Navigation /></a>}
            </article>

            <article className="decision-node reserve">
              <div className="tree-connector">if Plan B is not right</div>
              <div className="node-top"><span className="node-letter">C</span><span className="node-state">Reserve options</span></div>
              <h3>Other ways to complete the goal</h3>
              <ul>{plan.fallbackOptions.map((option) => <li key={option}>{option}</li>)}</ul>
            </article>
          </div>
          {plan.rankedOptions.length > 1 && <section className="alternate-results"><h3>Other {plan.intent.category === "activity" ? "activities" : "nearby options"}</h3><div>{plan.rankedOptions.slice(1).map((option) => {
            const activity = plan.activities.find((candidate) => candidate.venue.id === option.place.id);
            return <article key={option.place.id}><strong>#{option.rank} {activity?.title ?? option.place.name}</strong>{activity && <span>{activity.startLabel} · {activity.venue.name}</span>}<span>{option.transport.durationMinutes} min · {option.transport.distanceMiles} miles</span></article>;
          })}</div></section>}
          <div className="journey-actions"><button className="secondary-button" onClick={onClose}>Start a new request</button></div>
        </section>}
      </main>
    </div>
  );
}
