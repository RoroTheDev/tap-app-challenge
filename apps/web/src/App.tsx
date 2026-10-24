import { useEffect, useState } from "react";
import { ArrowRight, CalendarHeart, Check, HeartHandshake, MapPin, MessageCircleHeart, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { SeniorProfile, TrustedContact } from "@tap/shared";
import { AuthModal } from "./components/AuthModal";
import { Logo } from "./components/Logo";
import { Onboarding } from "./components/Onboarding";
import { isFirebaseConfigured, loadProfile, logOut, observeUser, saveProfile, type AppUser } from "./lib/firebase";

type AuthMode = "login" | "signup" | null;

function Landing({ openAuth }: { openAuth: (mode: Exclude<AuthMode, null>) => void }) {
  return (
    <div className="landing">
      <nav className="site-nav">
        <Logo />
        <div className="nav-actions"><button className="nav-link" onClick={() => openAuth("login")}>Log in</button><button className="nav-cta" onClick={() => openAuth("signup")}>Get started</button></div>
      </nav>

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
            <div className="plan-card card-three"><span className="mini-icon blue"><HeartHandshake /></span><div><small>NEXT STEP</small><strong>Ask Maya about a ride?</strong><button>Yes, prepare a text <ArrowRight /></button></div></div>
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
            <article><span>01</span><MessageCircleHeart /><h3>Say what you need</h3><p>Type it now, with voice coming next. Use everyday words and your preferred language.</p></article>
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

function Home({ user, profile, contacts, onEdit, onLogout }: { user: AppUser; profile: SeniorProfile; contacts: TrustedContact[]; onEdit: () => void; onLogout: () => void }) {
  return (
    <div className="app-home">
      <header><Logo /><div className="home-account"><span>{user.displayName}</span><button className="nav-link" onClick={onLogout}>Log out</button></div></header>
      <main className="welcome-card">
        <div className="success-badge"><Check /></div>
        <div className="eyebrow">YOUR PROFILE IS READY</div>
        <h1>Welcome, {profile.displayName.split(" ")[0]}.</h1>
        <p>TAP now knows enough to make suggestions that fit your life—without sharing your private details with the planner.</p>
        <div className="profile-summary">
          <span><MapPin /><b>{profile.city}, {profile.state}</b><small>Your area</small></span>
          <span><Sparkles /><b>{profile.hobbies.length || "A few"} interests</b><small>For better matches</small></span>
          <span><HeartHandshake /><b>{contacts.length} trusted {contacts.length === 1 ? "person" : "people"}</b><small>Only contacted with permission</small></span>
        </div>
        <div className="home-actions"><button className="primary-button">Tell TAP what you need <ArrowRight /></button><button className="secondary-button" onClick={onEdit}>Edit my profile</button></div>
        <p className="coming-next">The conversational planner is the next vertical slice.</p>
      </main>
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

  async function hydrate(nextUser: AppUser | null) {
    setUser(nextUser);
    if (nextUser) {
      const stored = await loadProfile(nextUser.uid);
      setProfile(stored.profile);
      setContacts(stored.contacts);
    } else {
      setProfile(null);
      setContacts([]);
    }
    setLoading(false);
  }

  useEffect(() => observeUser((nextUser) => void hydrate(nextUser)), []);

  async function handleSave(nextProfile: SeniorProfile, nextContacts: TrustedContact[]) {
    await saveProfile(nextProfile, nextContacts);
    setProfile(nextProfile);
    setContacts(nextContacts);
    setEditing(false);
  }

  async function handleLogout() {
    await logOut();
    await hydrate(null);
  }

  if (loading) return <div className="loading-screen"><Logo /><span>Getting TAP ready…</span></div>;
  if (!user) return <><Landing openAuth={setAuthMode} />{authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} onSuccess={(nextUser) => { setAuthMode(null); void hydrate(nextUser); }} />}</>;
  if (!profile?.onboardingComplete || editing) return <Onboarding user={user} initialProfile={profile} initialContacts={contacts} onSave={handleSave} />;
  return <Home user={user} profile={profile} contacts={contacts} onEdit={() => setEditing(true)} onLogout={() => void handleLogout()} />;
}
