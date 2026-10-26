import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarHeart, Check, HeartHandshake, MapPin, MessageCircleHeart, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { SeniorProfile, TrustedContact } from "@tap/shared";
import { AuthModal } from "./components/AuthModal";
import { Hub } from "./components/Hub";
import { Logo } from "./components/Logo";
import { LegalPage, type LegalDocument } from "./components/LegalPage";
import { Onboarding } from "./components/Onboarding";
import { PlanningJourney } from "./components/PlanningJourney";
import { deleteProfile, loadProfile, logOut, observeUser, saveProfile, type AppUser } from "./lib/firebase";
import { deleteConductorData } from "./lib/conductor";

type AuthMode = "login" | "signup" | null;
interface PlanSession { id: string; request: string; uid: string; }
const PROFILE_LOAD_TIMEOUT_MS = 15_000;
const ACTIVE_PLAN_KEY = "tap.active-plan";

function loadActivePlan(): PlanSession | null {
  if (!window.location.pathname.startsWith("/plan/")) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(ACTIVE_PLAN_KEY) ?? "null") as PlanSession | null;
    return value?.id && value.request && value.uid ? value : null;
  } catch { return null; }
}

function withTimeout<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Profile request timed out.")), milliseconds);
    operation.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function Landing({ openAuth, openLegal, authError }: { openAuth: (mode: Exclude<AuthMode, null>) => void; openLegal: (document: LegalDocument) => void; authError?: string }) {
  return (
    <div className="landing">
      <nav className="site-nav">
        <Logo />
        <div className="nav-actions"><button className="nav-link" onClick={() => openAuth("login")}>Log in</button><button className="nav-cta" onClick={() => openAuth("signup")}>Get started</button></div>
      </nav>
      {authError && <div className="auth-banner" role="alert">{authError}</div>}

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles /> A HELPING HAND FOR EVERYDAY LIFE</div>
            <h1>Life gets easier when you only have to <em>ask.</em></h1>
            <p>Cue listens to what you want to do, then brings the right people, places, and services together in one clear plan.</p>
            <div className="hero-actions"><button className="primary-button large" onClick={() => openAuth("signup")}>Start with Cue <ArrowRight /></button><span><ShieldCheck /> Free to join · You stay in control</span></div>
          </div>
          <div className="hero-visual" aria-label="A sample Cue plan">
            <div className="sun-shape" />
            <div className="plan-card card-one"><span className="mini-icon coral"><MessageCircleHeart /></span><div><small>YOU SAID</small><strong>“I want to go shopping.”</strong></div></div>
            <div className="plan-card card-two"><span className="mini-icon green"><MapPin /></span><div><small>Cue FOUND</small><strong>3 nearby stores</strong><p>Easy routes · Open today</p></div></div>
            <div className="plan-card card-three"><span className="mini-icon blue"><HeartHandshake /></span><div><small>NEXT STEP</small><strong>Ask Maya about a ride?</strong><span className="demo-action">Yes, prepare a text <ArrowRight /></span></div></div>
            <div className="floating-pill"><Check /> A simple plan, ready in moments</div>
          </div>
        </section>

        <section className="promise-strip">
          <div><Users /><span><strong>Made for real life</strong>Not another complicated app</span></div>
          <div><ShieldCheck /><span><strong>Private by design</strong>You choose what Cue can do</span></div>
          <div><MessageCircleHeart /><span><strong>Speaks your language</strong>Clear, patient, and personal</span></div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-intro"><div className="eyebrow">HOW Cue HELPS</div><h2>From “I wish…” to a plan you can use.</h2><p>No searching through five different apps. No confusing menus. Just tell Cue what matters today.</p></div>
          <div className="story-grid">
            <article><span>01</span><MessageCircleHeart /><h3>Say what you need</h3><p>Type it or use your voice. Speak naturally in your preferred language.</p></article>
            <article><span>02</span><Sparkles /><h3>Cue connects the pieces</h3><p>It considers your interests, mobility, location, schedule, and trusted circle.</p></article>
            <article><span>03</span><CalendarHeart /><h3>Choose your next step</h3><p>Get a short, ranked plan. Cue asks before contacting anyone or taking action.</p></article>
          </div>
        </section>

        <section className="cta-section"><div><div className="eyebrow">YOUR DAY, YOUR WAY</div><h2>Let’s make everyday plans feel possible again.</h2></div><button className="primary-button light" onClick={() => openAuth("signup")}>Create my free profile <ArrowRight /></button></section>
      </main>
      <footer className="site-footer"><Logo /><p>Technology that brings people closer.</p><nav aria-label="Legal"><button className="text-button" onClick={() => openLegal("privacy")}>Privacy</button><button className="text-button" onClick={() => openLegal("terms")}>Terms</button></nav><span>© 2026 Cue</span></footer>
    </div>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<SeniorProfile | null>(null);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [authError, setAuthError] = useState("");
  const [activePlan, setActivePlan] = useState<PlanSession | null>(loadActivePlan);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(() => window.location.pathname === "/privacy" ? "privacy" : window.location.pathname === "/terms" ? "terms" : null);
  const hydrationSequence = useRef(0);

  async function hydrate(nextUser: AppUser | null) {
    const sequence = ++hydrationSequence.current;
    setLoading(true);
    setLoadError("");
    setUser(nextUser);
    if (nextUser) setAuthError("");
    try {
      if (nextUser) {
        const stored = await withTimeout(loadProfile(nextUser.uid), PROFILE_LOAD_TIMEOUT_MS);
        if (sequence !== hydrationSequence.current) return;
        setProfile(stored.profile);
        setContacts(stored.contacts);
      } else {
        setProfile(null);
        setContacts([]);
      }
    } catch {
      if (sequence !== hydrationSequence.current) return;
      setLoadError("Cue couldn't load your profile. Check your connection and try again.");
    } finally {
      if (sequence === hydrationSequence.current) setLoading(false);
    }
  }

  useEffect(() => observeUser(
    (nextUser) => void hydrate(nextUser),
    (error) => {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setAuthError(code.includes("redirect-incomplete")
        ? "Google sign-in returned without completing. Please try once more, or use email sign-in."
        : "Google sign-in could not be completed. Please try again.");
      setLoading(false);
    },
  ), []);

  useEffect(() => {
    const handleHistory = () => {
      setLegalDocument(window.location.pathname === "/privacy" ? "privacy" : window.location.pathname === "/terms" ? "terms" : null);
      if (!window.location.pathname.startsWith("/plan/")) setActivePlan(null);
    };
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);

  function startPlan(request: string) {
    if (!user) return;
    const session = { id: crypto.randomUUID(), request, uid: user.uid };
    sessionStorage.setItem(ACTIVE_PLAN_KEY, JSON.stringify(session));
    window.history.pushState({ tapPlanId: session.id }, "", `/plan/${session.id}`);
    setActivePlan(session);
  }

  function closePlan() {
    sessionStorage.removeItem(ACTIVE_PLAN_KEY);
    window.history.replaceState({}, "", "/");
    setActivePlan(null);
  }

  function openLegal(document: LegalDocument) {
    window.history.pushState({}, "", `/${document}`);
    setLegalDocument(document);
  }

  function closeLegal() {
    window.history.pushState({}, "", "/");
    setLegalDocument(null);
  }

  async function handleSave(nextProfile: SeniorProfile, nextContacts: TrustedContact[]) {
    await saveProfile(nextProfile, nextContacts);
    setProfile(nextProfile);
    setContacts(nextContacts);
    setEditing(false);
  }

  async function handleLogout() {
    setLoading(true);
    try {
      closePlan();
      await logOut();
      await hydrate(null);
    } catch {
      setLoadError("Cue couldn't log you out. Check your connection and try again.");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    await deleteConductorData(user);
    await deleteProfile(user.uid);
    sessionStorage.removeItem(`tap.onboarding-draft.${user.uid}`);
    closePlan();
    setProfile(null);
    setContacts([]);
  }

  if (legalDocument) return <LegalPage document={legalDocument} onBack={closeLegal} onSwitch={openLegal} />;
  if (loading) return <div className="loading-screen"><Logo /><span>Getting Cue ready…</span></div>;
  if (loadError) return <div className="loading-screen error-state"><Logo /><p role="alert">{loadError}</p><div><button className="primary-button" onClick={() => void hydrate(user)}>Try again</button><button className="secondary-button" onClick={() => void handleLogout()}>Log out</button></div></div>;
  if (!user) return <><Landing openAuth={setAuthMode} openLegal={openLegal} authError={authError} />{authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} onSuccess={(nextUser) => { setAuthMode(null); void hydrate(nextUser); }} />}</>;
  if (!profile?.onboardingComplete || editing) return <Onboarding user={user} initialProfile={profile} initialContacts={contacts} onSave={handleSave} onCancel={editing ? () => setEditing(false) : undefined} />;
  if (activePlan?.uid === user.uid) return <PlanningJourney sessionId={activePlan.id} request={activePlan.request} user={user} profile={profile} contacts={contacts} onClose={closePlan} />;
  return <Hub user={user} profile={profile} contacts={contacts} onEdit={() => setEditing(true)} onLogout={() => void handleLogout()} onDelete={handleDelete} onStartPlan={startPlan} />;
}
