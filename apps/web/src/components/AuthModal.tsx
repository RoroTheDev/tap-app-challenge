import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Eye, EyeOff, X } from "lucide-react";
import { continueWithEmail, continueWithGoogle, isFirebaseConfigured, type AppUser } from "../lib/firebase";

interface AuthModalProps {
  initialMode: "login" | "signup";
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
}

function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("popup-closed")) return "The Google sign-in window was closed. Please try again.";
  if (code.includes("email-already-in-use")) return "That email already has an account. Try logging in.";
  if (code.includes("invalid-credential")) return "We couldn't match that email and password.";
  if (code.includes("weak-password")) return "Use at least 6 characters for your password.";
  if (code.includes("operation-not-allowed")) return "This sign-in method still needs to be enabled in Firebase.";
  if (code.includes("unauthorized-domain")) return "This website still needs to be added to Firebase's authorized domains.";
  if (code.includes("network-request-failed")) return "We couldn't reach Firebase. Check your connection and try again.";
  if (code.includes("redirect-blocked")) return "This browser blocked Google sign-in. Open TAP in Chrome, Edge, or Safari—or use email instead.";
  return "We couldn't sign you in. Please try again.";
}

export function AuthModal({ initialMode, onClose, onSuccess }: AuthModalProps) {
  const modalRef = useRef<HTMLElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    firstControlRef.current?.focus();
    return () => previouslyFocused.current?.focus();
  }, []);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !busy) onClose();
    if (event.key !== "Tab") return;
    const controls = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]') ?? []);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  async function run(action: () => Promise<AppUser | null>) {
    setBusy(true);
    setError("");
    try {
      const nextUser = await action();
      if (nextUser) onSuccess(nextUser);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(() => continueWithEmail(mode, email, password, name));
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={modalRef} className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description" onKeyDown={handleDialogKeyDown}>
        <button ref={firstControlRef} type="button" className="icon-button close-button" onClick={onClose} aria-label="Close sign in"><X /></button>
        <div className="eyebrow">WELCOME TO TAP</div>
        <h2 id="auth-title">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p className="modal-copy" id="auth-description">
          {mode === "signup" ? "A few simple details now will help TAP support you better." : "Sign in to continue where you left off."}
        </p>

        <button type="button" className="google-button" disabled={busy} onClick={() => void run(continueWithGoogle)}>
          <span className="google-g">G</span>
          Continue with Google
        </button>
        <div className="divider"><span>or use email</span></div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>What should we call you?
              <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your name" />
            </label>
          )}
          <label>Email address
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" />
          </label>
          <label>Password
            <span className="password-field">
              <input required minLength={6} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="At least 6 characters" />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button>
            </span>
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          {!isFirebaseConfigured && <div className="demo-note">Preview mode: your information stays in this browser.</div>}
          <button className="primary-button wide" disabled={busy} type="submit">
            {busy ? "One moment…" : mode === "signup" ? "Create account" : "Log in"}
            {!busy && <ArrowRight />}
          </button>
        </form>
        <p className="switch-auth">
          {mode === "signup" ? "Already have an account?" : "New to TAP?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}>
            {mode === "signup" ? "Log in" : "Create one"}
          </button>
        </p>
      </section>
    </div>
  );
}
