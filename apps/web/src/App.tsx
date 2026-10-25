import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarHeart, Check, HeartHandshake, MapPin, MessageCircleHeart, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { SeniorProfile, TrustedContact } from "@tap/shared";
import { AuthModal } from "./components/AuthModal";
import { Hub } from "./components/Hub";
import { Logo } from "./components/Logo";
import { Onboarding } from "./components/Onboarding";
import { deleteProfile, loadProfile, logOut, observeUser, saveProfile, type AppUser } from "./lib/firebase";

type AuthMode = "login" | "signup" | null;
const PROFILE_LOAD_TIMEOUT_MS = 15_000;

function withTimeout<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Profile request timed out.")), milliseconds);
    operation.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function Landing({ openAuth, authError }: { openAuth: (mode: Exclude<AuthMode, null>) => void; authError?: string }) {
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
            <p>TAP listens to what you want to do, then brings the right people, places, and services together in one clear plan.</p>
            <div className="hero-actions"><button className="primary-button large" onClick={() => openAuth("signup")}>Start with TAP <ArrowRight /></button><span><ShieldCheck /> Free to join · You stay in control</span></div>
          </div>
          <div className="hero-visual" aria-label="A sample TAP plan">
            <div className="sun-shape" />
            <div className="plan-card card-one"><span className="mini-icon coral"><MessageCircleHeart /></span><div><small>YOU SAID</small><strong>“I want to go shopping.”</strong></div></div>
            <div className="plan-card card-two"><span className="mini-icon green"><MapPin /></span><div><small>TAP FOUND</small><strong>3 nearby stores</strong><p>Easy routes · Open today</p></div></div>
            <div className="plan-card card-three"><span className="mini-icon blue"><HeartHandshake /></span><div><small>NEXT STEP</small><strong>Ask Maya about a ride?</strong><span className="demo-action">Yes, prepare a text <ArrowRight /></span></div></div>
            <div className="floating-pill"><Check /> A simple plan, ready in moments</div>
          </div>
        </section>

        <section className="promise-strip">
          <div><Users /><span><strong>Made for real life</strong>Not another complicated app</span></div>
          <div><ShieldCheck /><span><strong>Private by design</strong>You choose what TAP can do</span></div>
          <div><MessageCircleHeart /><span><strong>Speaks your language</strong>Clear, patient, and personal</span></div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-intro"><div className="eyebrow">HOW TAP HELPS</div><h2>From “I wish…” to a plan you can use.</h2><p>No searching through five different apps. No confusing menus. Just tell TAP what matters today.</p></div>
          <div className="story-grid">
            <article><span>01</span><MessageCircleHeart /><h3>Say what you need</h3><p>Type it or use your voice. Speak naturally in your preferred language.</p></article>
            <article><span>02</span><Sparkles /><h3>TAP connects the pieces</h3><p>It considers your interests, mobility, location, schedule, and trusted circle.</p></article>
            <article><span>03</span><CalendarHeart /><h3>Choose your next step</h3><p>Get a short, ranked plan. TAP asks before contacting anyone or taking action.</p></article>
          </div>
        </section>

        <section className="cta-section"><div><div className="eyebrow">YOUR DAY, YOUR WAY</div><h2>Let’s make everyday plans feel possible again.</h2></div><button className="primary-button light" onClick={() => openAuth("signup")}>Create my free profile <ArrowRight /></button></section>
      </main>
      <footer className="site-footer"><Logo /><p>Technology that brings people closer.</p><span>© 2026 TAP</span></footer>
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
      setLoadError("TAP couldn't load your profile. Check your connection and try again.");
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

  async function handleSave(nextProfile: SeniorProfile, nextContacts: TrustedContact[]) {
    await saveProfile(nextProfile, nextContacts);
    setProfile(nextProfile);
    setContacts(nextContacts);
    setEditing(false);
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await logOut();
      await hydrate(null);
    } catch {
      setLoadError("TAP couldn't log you out. Check your connection and try again.");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    await deleteProfile(user.uid);
    sessionStorage.removeItem(`tap.onboarding-draft.${user.uid}`);
    setProfile(null);
    setContacts([]);
  }

  if (loading) return <div className="loading-screen"><Logo /><span>Getting TAP ready…</span></div>;
  if (loadError) return <div className="loading-screen error-state"><Logo /><p role="alert">{loadError}</p><div><button className="primary-button" onClick={() => void hydrate(user)}>Try again</button><button className="secondary-button" onClick={() => void handleLogout()}>Log out</button></div></div>;
  if (!user) return <><Landing openAuth={setAuthMode} authError={authError} />{authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} onSuccess={(nextUser) => { setAuthMode(null); void hydrate(nextUser); }} />}</>;
  if (!profile?.onboardingComplete || editing) return <Onboarding user={user} initialProfile={profile} initialContacts={contacts} onSave={handleSave} />;
  return <Hub user={user} profile={profile} contacts={contacts} onEdit={() => setEditing(true)} onLogout={() => void handleLogout()} onDelete={handleDelete} />;
}
