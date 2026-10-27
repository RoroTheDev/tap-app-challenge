import { useEffect, useLayoutEffect, useState } from "react";
import { Accessibility, ArrowLeft, CalendarDays, Check, Clock3, MapPin, MessageCircle, Navigation, RotateCcw, Send, Share2, Sparkles, Ticket } from "lucide-react";
import type { ConductorResponse, CoordinationStatus, SeniorProfile, TrustedContact } from "@tap/shared";
import type { AppUser } from "../lib/firebase";
import { createPlanningSession, readCoordinationStatus, readPlanningSession, requestConductorPlan, sendContactRequest, updatePlanningSession } from "../lib/conductor";
import { activePlanBranch, getFeatureDefinition, getPhaseLabel, type PlanningPhase } from "../lib/workflow";
import { buildUberDeepLink } from "../lib/uber";
import { buildSharePlanData, sharePlan } from "../lib/share-plan";
import { Logo } from "./Logo";

interface PlanningJourneyProps {
  sessionId: string;
  request: string;
  user: AppUser;
  profile: SeniorProfile;
  contacts: TrustedContact[];
  onClose: () => void;
}

const loadingStatus: Record<PlanningPhase, string> = {
  understanding: "Understanding your request",
  discovering: "Finding the best options",
  transport: "Checking the trip",
  fallbacks: "Preparing a backup",
  ready: "Your plan is ready",
};

const loadingProgress: Record<PlanningPhase, string> = {
  understanding: "18%",
  discovering: "42%",
  transport: "66%",
  fallbacks: "84%",
  ready: "100%",
};

function transportLabel(mode: string) {
  const normalized = mode.toLowerCase();
  if (normalized === "drive") return "by car";
  if (normalized === "walk") return "walking";
  if (normalized === "transit" || normalized === "public transit") return "by public transit";
  if (normalized === "family or friend") return "with family or a friend";
  if (normalized === "drive myself") return "driving";
  if (normalized === "rideshare") return "by rideshare";
  return `by ${mode}`;
}

function durationLabel(minutes: number) {
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function PlanningJourney({ sessionId, request, user, profile, contacts, onClose }: PlanningJourneyProps) {
  const [phase, setPhase] = useState<PlanningPhase>("understanding");
  const [plan, setPlan] = useState<ConductorResponse | null>(null);
  const [error, setError] = useState("");
  const [contactReview, setContactReview] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [coordination, setCoordination] = useState<{ id: string; status: CoordinationStatus; expiresAt: string } | null>(null);
  const primaryContact = contacts.find((contact) => contact.isPrimary && contact.permissionConfirmed && contact.canReceiveSms)
    ?? contacts.find((contact) => contact.permissionConfirmed && contact.canReceiveSms);
  const needsContact = Boolean(plan?.intent.tags.includes("contact") && plan.contactMessage.available && primaryContact);
  const branch = activePlanBranch(needsContact, coordination?.status);
  const feature = getFeatureDefinition(plan?.intent.category);
  const primaryActivity = plan?.activities.find((activity) => activity.venue.id === plan.rankedOptions[0]?.place.id);
  const uberLink = buildUberDeepLink(import.meta.env.VITE_UBER_CLIENT_ID as string | undefined, plan?.rankedOptions[0]?.place);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [sessionId, Boolean(plan)]);

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
        // A cold Firebase function can make persistence slow on the first run.
        // Start the actual plan immediately and treat session restore/save as
        // best-effort so it can never block the user-facing result.
        const existingPromise = readPlanningSession(user, sessionId).catch(() => null);
        const planPromise = requestConductorPlan(request, user, profile, contacts);
        const existing = await Promise.race([
          existingPromise,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1_200)),
        ]);
        if (existing?.plan) {
          void planPromise.catch(() => undefined);
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
        if (!existing) void createPlanningSession(user, sessionId, request).catch(() => undefined);
        const result = await planPromise;
        if (stopped) return;
        timers.forEach(window.clearTimeout);
        setPlan(result);
        setPhase("ready");
        await updatePlanningSession(user, sessionId, { phase: "ready", status: "ready", plan: result }).catch(() => undefined);
      } catch (reason) {
        if (!stopped) {
          setError(reason instanceof Error ? reason.message : "Cue could not prepare this plan.");
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
        if (!stopped) setContactError("Cue could not check the reply. Your backup plan is still ready.");
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
      setContactError(reason instanceof Error ? reason.message : "Cue could not contact this person.");
      setCoordination({ id: "failed", status: "failed", expiresAt: new Date().toISOString() });
      void updatePlanningSession(user, sessionId, { coordinationStatus: "failed", status: "fallback", selectedOptionRank: 2 }).catch(() => undefined);
    } finally { setContactBusy(false); }
  }

  function useBackupInstead() {
    setContactReview(false);
    setCoordination({ id: "manual-fallback", status: "declined", expiresAt: new Date().toISOString() });
    void updatePlanningSession(user, sessionId, { coordinationStatus: "declined", coordinationId: "manual-fallback", coordinationExpiresAt: new Date().toISOString(), status: "fallback", selectedOptionRank: 2 }).catch(() => undefined);
  }

  async function sharePrimaryOption() {
    const option = plan?.rankedOptions[0];
    if (!option) return;
    setShareStatus("");
    try {
      const result = await sharePlan(buildSharePlanData(option, primaryActivity));
      if (result === "copied") setShareStatus("Plan copied. You can paste it into a message.");
      if (result === "shared") setShareStatus("Plan shared.");
    } catch {
      setShareStatus("Cue couldn't open sharing. Use the directions link instead.");
    }
  }

  return (
    <div className="journey-shell">
      <header className="journey-header"><Logo /><button className="nav-link" onClick={onClose}><ArrowLeft /> Back to Cue</button></header>
      <main className={`journey-main ${plan ? "plan-ready-view" : "journey-loading-view"}`} id="tap-journey-main">
        {plan && <div className="journey-intro">
          <div className="eyebrow"><Sparkles /> Cue CONDUCTOR</div>
          <h1>{feature.label}</h1>
          <p>“{request}”</p>
        </div>}

        {!plan && !error && <section className="journey-loading simple-loading" role="status" aria-live="polite">
          <div className="conductor-orbit"><Sparkles /><i /><i /><i /></div>
          <div className="eyebrow">MAKING YOUR PLAN</div>
          <h1>{loadingStatus[phase]}</h1>
          <p className="loading-request">“{request}”</p>
          <div className="simple-progress" aria-label={getPhaseLabel(phase)}><span style={{ width: loadingProgress[phase] }} /></div>
          <small>Usually ready in a few seconds</small>
        </section>}
        {error && <section className="journey-error"><h2>We couldn’t finish this plan</h2><p>{error}</p><button className="primary-button" onClick={onClose}>Try another request</button></section>}

        {plan && <section className="decision-area focused-plan">
          <div className="decision-heading"><div><span>PLAN READY</span><h2>{feature.resultLabel}</h2></div><small>A backup is ready if plans change.</small></div>

          <article className="plan-spotlight">
            <div className="node-top"><span className="node-letter">A</span><span className="node-state">Best match</span></div>
            {plan.rankedOptions[0] ? <>
              <h3>{primaryActivity?.title ?? plan.rankedOptions[0].place.name}</h3>
              <div className="spotlight-facts">
                {primaryActivity && <span><CalendarDays /> {primaryActivity.startLabel}</span>}
                <span><MapPin /> {primaryActivity ? primaryActivity.venue.name : plan.rankedOptions[0].place.address}</span>
                <span><Navigation /> {durationLabel(plan.rankedOptions[0].transport.durationMinutes)} {transportLabel(plan.rankedOptions[0].transport.mode)}</span>
                {primaryActivity && <span><Ticket /> {primaryActivity.costLabel}</span>}
              </div>
              {primaryActivity && <div className="spotlight-notes"><span><Accessibility /> {primaryActivity.accessibilityLabel}</span>{primaryActivity.registrationUrl && <a href={primaryActivity.registrationUrl} target="_blank" rel="noreferrer">Official details</a>}</div>}
              <button type="button" className="share-plan-button" onClick={() => void sharePrimaryOption()}><Share2 /> Share this option</button>
              {shareStatus && <span className="share-status" role="status">{shareStatus}</span>}
            </> : <p>Cue found no matching place yet.</p>}
          </article>

          <article className="single-action-card">
            <span className="action-label">YOUR NEXT STEP</span>
            {branch === "coordination" && !contactReview && !coordination && <>
              <h3>Ask {primaryContact?.name || "your trusted contact"} for a ride?</h3>
              <p>You will see the message before it is sent.</p>
              <button className="primary-button wide" onClick={() => setContactReview(true)}>Review message <MessageCircle /></button>
            </>}
            {branch === "coordination" && contactReview && !coordination && <>
              <p className="message-preview">{plan.contactMessage.draft}</p>
              <button className="primary-button wide" disabled={contactBusy} onClick={() => void askTrustedContact()}>{contactBusy ? "Sending…" : "Confirm and send"} <Send /></button>
              <button className="text-button backup-link" onClick={useBackupInstead}>Use Plan B instead</button>
            </>}
            {coordination?.status === "waiting" && <div className="coordination-status waiting"><Clock3 /> Waiting up to two minutes for YES or NO…</div>}
            {coordination?.status === "accepted" && <><div className="coordination-status accepted"><Check /> Help accepted. Plan A is confirmed.</div><a className="primary-button wide link-button" href={plan.rankedOptions[0]?.place.mapsUrl} target="_blank" rel="noreferrer">Open directions <Navigation /></a></>}
            {branch === "primary" && !needsContact && <><h3>Your route is ready.</h3><a className="primary-button wide link-button" href={plan.rankedOptions[0]?.place.mapsUrl} target="_blank" rel="noreferrer">Open directions <Navigation /></a></>}
            {branch === "fallback" && <><div className="coordination-status fallback"><RotateCcw /> {coordination?.id === "manual-fallback" ? "You chose Plan B." : coordination?.status === "declined" ? "Your contact is not available." : coordination?.status === "timed_out" ? "No reply arrived in time." : "Cue switched to Plan B."}</div><a className="primary-button wide link-button" href={uberLink} target="_blank" rel="noreferrer">Open Uber with destination <Navigation /></a></>}
            {contactError && <div className="form-error" role="alert">{contactError}</div>}
          </article>

          <div className="backup-readiness" aria-label="Backup readiness"><span><Check /> Best option ready</span><span><Check /> Ride backup ready</span><span><Check /> Other choices ready</span></div>
        </section>}
      </main>
    </div>
  );
}
