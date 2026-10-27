import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HeartHandshake,
  LockKeyhole,
  Plus,
  Trash2,
} from "lucide-react";
import {
  hobbyOptions,
  languageOptions,
  normalizeSeniorProfile,
  normalizeTrustedContacts,
  transportOptions,
  type SeniorProfile,
  type TrustedContact,
} from "@tap/shared";
import type { AppUser } from "../lib/firebase";
import { onboardingStepError } from "../lib/validation";

const steps = ["About you", "Getting around", "What you enjoy", "Trusted circle", "Privacy"];
const dayOptions = ["Weekdays", "Weekends"];
const timeOptions = ["Morning", "Afternoon", "Evening"];

function newContact(uid: string, isPrimary = false): TrustedContact {
  return {
    id: crypto.randomUUID(),
    uid,
    name: "",
    relationship: "",
    phone: "",
    email: "",
    isPrimary,
    canReceiveSms: true,
    permissionConfirmed: false,
  };
}

interface OnboardingProps {
  user: AppUser;
  initialProfile?: SeniorProfile | null;
  initialContacts?: TrustedContact[];
  onSave: (profile: SeniorProfile, contacts: TrustedContact[]) => Promise<void>;
  onCancel?: () => void;
  onExit?: () => void;
}

export function Onboarding({ user, initialProfile, initialContacts = [], onSave, onCancel, onExit }: OnboardingProps) {
  const draftKey = `tap.onboarding-draft.${user.uid}`;
  const draft = useMemo(() => {
    if (initialProfile) return null;
    try { return JSON.parse(sessionStorage.getItem(draftKey) ?? "null") as { profile?: SeniorProfile; contacts?: TrustedContact[] } | null; } catch { return null; }
  }, [draftKey, initialProfile]);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<SeniorProfile>(() => normalizeSeniorProfile(initialProfile ?? draft?.profile, user));
  const [contacts, setContacts] = useState<TrustedContact[]>(normalizeTrustedContacts(initialContacts.length ? initialContacts : draft?.contacts?.length ? draft.contacts : [newContact(user.uid, true)], user.uid));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftWarning, setDraftWarning] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const progress = ((step + 1) / steps.length) * 100;
  const firstName = profile.displayName.trim().split(/\s+/)[0] || "there";
  const stepError = useMemo(() => onboardingStepError(step, profile, contacts), [contacts, profile, step]);
  const canContinue = !stepError;
  const editing = Boolean(initialProfile?.onboardingComplete);

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ profile, contacts }));
      setDraftWarning("");
    } catch {
      setDraftWarning("This browser could not save a temporary draft. Keep this page open until you finish.");
    }
  }, [contacts, draftKey, profile]);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  function update<K extends keyof SeniorProfile>(field: K, value: SeniorProfile[K]) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function toggleList(field: "transportModes" | "hobbies" | "preferredDays" | "preferredTimes", value: string) {
    const values = profile[field];
    update(field, values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function updateContact(id: string, field: keyof TrustedContact, value: string | boolean) {
    setContacts((current) => normalizeTrustedContacts(current.map((contact) => contact.id === id ? { ...contact, [field]: value } : contact), user.uid));
  }

  async function finish() {
    const invalidStep = [0, 1, 3, 4].find((candidate) => onboardingStepError(candidate, profile, contacts));
    if (invalidStep !== undefined) {
      setStep(invalidStep);
      setError(onboardingStepError(invalidStep, profile, contacts));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const activeContacts = normalizeTrustedContacts(contacts.filter((contact) => contact.name.trim()), user.uid);
      await onSave({ ...profile, onboardingComplete: true }, activeContacts);
      sessionStorage.removeItem(draftKey);
    } catch {
      setError("We couldn't save your profile yet. Your answers are still here—please try once more.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <div>
          <div className="eyebrow">LET'S GET TO KNOW YOU</div>
          <h1 ref={headingRef} tabIndex={-1}>{step === 0 ? `Hi ${firstName}.` : steps[step]}</h1>
        </div>
        <span className="step-count">Step {step + 1} of {steps.length}</span>
      </header>
      <div className="progress-track" aria-label={`Onboarding progress: step ${step + 1} of ${steps.length}`}><span style={{ width: `${progress}%` }} /></div>
      {editing && <nav className="profile-step-nav" aria-label="Profile sections">
        {steps.map((label, index) => <button type="button" key={label} className={index === step ? "active" : ""} aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)}>{label}</button>)}
      </nav>}

      <section className="quiz-card">
        {step === 0 && (
          <div className="form-section">
            <h2>A little about you</h2>
            <p>Choose the language Cue should use in your main hub and when listening to voice requests.</p>
            <div className="field-grid two">
              <label>Preferred name <span className="required">Required</span>
                <input value={profile.displayName} onChange={(event) => update("displayName", event.target.value)} maxLength={80} />
              </label>
              <label>Your phone number <span className="optional">Optional</span>
                <input type="tel" value={profile.phone} onChange={(event) => update("phone", event.target.value)} placeholder="(555) 555-0123" maxLength={24} />
              </label>
              <label>Birth year <span className="optional">Optional</span>
                <input type="number" min="1900" max={new Date().getFullYear()} value={profile.birthYear ?? ""} onChange={(event) => update("birthYear", event.target.value ? Number(event.target.value) : null)} placeholder="1955" />
              </label>
              <label>How should Cue reach you?
                <select value={profile.contactPreference} onChange={(event) => update("contactPreference", event.target.value as SeniorProfile["contactPreference"])}>
                  <option value="text">Text message</option><option value="call">Phone call</option><option value="email">Email</option>
                </select>
              </label>
              <label>What language should Cue speak with you? <span className="required">Required</span>
                <select value={profile.preferredLanguage} onChange={(event) => update("preferredLanguage", event.target.value)}>
                  {languageOptions.map((language) => <option key={language}>{language}</option>)}
                </select>
              </label>
              <label>Another language <span className="optional">Optional</span>
                <input value={profile.secondaryLanguage} onChange={(event) => update("secondaryLanguage", event.target.value)} maxLength={40} placeholder="Language or dialect" />
              </label>
            </div>
            <label>How can Cue communicate more clearly with you? <span className="optional">Optional</span>
              <textarea value={profile.communicationNotes} onChange={(event) => update("communicationNotes", event.target.value)} maxLength={500} placeholder="For example: Use short sentences, read choices aloud, or give me extra time." />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="form-section">
            <h2>Home and transportation</h2>
            <p>We use your area to find nearby options. Your full address is never sent to the AI planner.</p>
            <div className="field-grid two">
              <label className="span-two">Street address <span className="optional">Optional</span>
                <input value={profile.addressLine1} onChange={(event) => update("addressLine1", event.target.value)} maxLength={120} placeholder="123 Main Street" />
              </label>
              <label>Apartment or unit <span className="optional">Optional</span>
                <input value={profile.addressLine2} onChange={(event) => update("addressLine2", event.target.value)} maxLength={60} />
              </label>
              <label>City <span className="required">Required</span>
                <input value={profile.city} onChange={(event) => update("city", event.target.value)} maxLength={60} />
              </label>
              <label>State <span className="required">Required</span>
                <input value={profile.state} onChange={(event) => update("state", event.target.value)} maxLength={40} />
              </label>
              <label>ZIP code <span className="optional">Optional</span>
                <input value={profile.postalCode} onChange={(event) => update("postalCode", event.target.value)} maxLength={12} inputMode="numeric" />
              </label>
            </div>
            <fieldset>
              <legend>Do you use a mobility aid?</legend>
              <div className="choice-row">
                {[['none', 'No'], ['cane', 'Cane'], ['walker', 'Walker'], ['wheelchair', 'Wheelchair'], ['other', 'Other']].map(([value, label]) => (
                  <button key={value} type="button" className={`choice-chip ${profile.mobility === value ? "selected" : ""}`} onClick={() => update("mobility", value as SeniorProfile["mobility"])}>{profile.mobility === value && <Check />} {label}</button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Ways you are comfortable getting around <span className="optional">Choose any</span></legend>
              <div className="choice-row">
                {transportOptions.map((option) => <button key={option} type="button" className={`choice-chip ${profile.transportModes.includes(option) ? "selected" : ""}`} onClick={() => toggleList("transportModes", option)}>{profile.transportModes.includes(option) && <Check />} {option}</button>)}
              </div>
            </fieldset>
            <div className="field-grid three planning-preferences">
              <label>Comfortable walking level
                <select value={profile.walkingTolerance} onChange={(event) => update("walkingTolerance", event.target.value as SeniorProfile["walkingTolerance"])}>
                  <option value="short">Short distances</option><option value="moderate">Some walking</option><option value="long">Longer walks are okay</option>
                </select>
              </label>
              <label>Usual travel limit
                <select value={profile.maxTravelMinutes} onChange={(event) => update("maxTravelMinutes", Number(event.target.value) as SeniorProfile["maxTravelMinutes"])}>
                  <option value={15}>About 15 minutes</option><option value={30}>About 30 minutes</option><option value={45}>About 45 minutes</option><option value={60}>About 1 hour</option><option value={0}>Flexible</option>
                </select>
              </label>
              <label>How many choices should Cue show?
                <select value={profile.planPreference} onChange={(event) => update("planPreference", event.target.value as SeniorProfile["planPreference"])}>
                  <option value="simple">One best choice</option><option value="balanced">A few choices</option><option value="detailed">More detail and options</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-section">
            <h2>What brings you joy?</h2>
            <p>Choose anything you enjoy now—or might like to try.</p>
            <div className="choice-grid">
              {hobbyOptions.map((option) => <button key={option} type="button" className={`choice-card ${profile.hobbies.includes(option) ? "selected" : ""}`} onClick={() => toggleList("hobbies", option)}><span>{profile.hobbies.includes(option) && <Check />}</span>{option}</button>)}
            </div>
            <label>Anything else you enjoy? <span className="optional">Optional</span>
              <textarea value={profile.otherInterests} onChange={(event) => update("otherInterests", event.target.value)} maxLength={300} placeholder="Tell us in your own words…" />
            </label>
            <div className="field-grid two">
              <fieldset><legend>Best days</legend><div className="choice-row">{dayOptions.map((option) => <button key={option} type="button" className={`choice-chip ${profile.preferredDays.includes(option) ? "selected" : ""}`} onClick={() => toggleList("preferredDays", option)}>{option}</button>)}</div></fieldset>
              <fieldset><legend>Best times</legend><div className="choice-row">{timeOptions.map((option) => <button key={option} type="button" className={`choice-chip ${profile.preferredTimes.includes(option) ? "selected" : ""}`} onClick={() => toggleList("preferredTimes", option)}>{option}</button>)}</div></fieldset>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-section">
            <div className="section-heading-with-icon"><HeartHandshake /><div><h2>Your trusted circle</h2><p>Add someone Cue may help you coordinate with. You can skip this and add them later.</p></div></div>
            <div className="contact-list">
              {contacts.map((contact, index) => (
                <article className="contact-card" key={contact.id}>
                  <div className="contact-card-title"><h3>{index === 0 ? "Primary contact" : `Contact ${index + 1}`}</h3><button type="button" className="text-button danger" onClick={() => setContacts((current) => normalizeTrustedContacts(current.filter((item) => item.id !== contact.id), user.uid))}><Trash2 /> Remove</button></div>
                  <div className="field-grid two">
                    <label>Name<input value={contact.name} onChange={(event) => updateContact(contact.id, "name", event.target.value)} maxLength={80} placeholder="Full name" /></label>
                    <label>Relationship<input value={contact.relationship} onChange={(event) => updateContact(contact.id, "relationship", event.target.value)} maxLength={40} placeholder="Daughter, friend, neighbor…" /></label>
                    <label>Phone number<input type="tel" value={contact.phone} onChange={(event) => updateContact(contact.id, "phone", event.target.value)} maxLength={24} placeholder="(555) 555-0123" /></label>
                    <label>Email <span className="optional">Optional</span><input type="email" value={contact.email} onChange={(event) => updateContact(contact.id, "email", event.target.value)} maxLength={120} /></label>
                  </div>
                  <label className="check-line"><input type="checkbox" checked={contact.canReceiveSms} onChange={(event) => updateContact(contact.id, "canReceiveSms", event.target.checked)} /><span>Cue may prepare text messages for this person when I ask.</span></label>
                  <label className="check-line"><input type="checkbox" checked={contact.permissionConfirmed} onChange={(event) => updateContact(contact.id, "permissionConfirmed", event.target.checked)} /><span>I have this person's permission to save their contact information.</span></label>
                </article>
              ))}
            </div>
            {contacts.length < 5 && <button type="button" className="secondary-button" onClick={() => setContacts((current) => normalizeTrustedContacts([...current, newContact(user.uid)], user.uid))}><Plus /> Add {contacts.length ? "another person" : "a trusted person"}</button>}
          </div>
        )}

        {step === 4 && (
          <div className="form-section privacy-step">
            <div className="privacy-icon"><LockKeyhole /></div>
            <h2>You stay in control.</h2>
            <p>These answers make Cue more useful, but they belong to you. You can update or delete them later.</p>
            <div className="privacy-points">
              <div><Check /><span><strong>Your profile is private.</strong> Only your signed-in account can read it.</span></div>
              <div><Check /><span><strong>The planner gets less.</strong> We share your city and preferences, not your exact street address or contact numbers.</span></div>
              <div><Check /><span><strong>Actions need permission.</strong> Cue will ask before messaging a contact, booking, or sharing location.</span></div>
            </div>
            <label className="check-line consent"><input type="checkbox" checked={profile.personalizationConsent} onChange={(event) => update("personalizationConsent", event.target.checked)} /><span>I agree to let Cue use my answers to personalize suggestions. <b>Required</b></span></label>
            <label className="check-line consent"><input type="checkbox" checked={profile.locationUseConsent} onChange={(event) => update("locationUseConsent", event.target.checked)} /><span>Cue may use my address to calculate nearby options and travel time. <b>Optional</b></span></label>
            <label>Anything Cue should know to make things easier? <span className="optional">Optional</span>
              <textarea value={profile.accessibilityNotes} onChange={(event) => update("accessibilityNotes", event.target.value)} maxLength={500} placeholder="For example: I prefer large text, quiet places, or routes without stairs." />
            </label>
          </div>
        )}

        {stepError && <div className="form-guidance" id="step-help" role="status">{stepError}</div>}
        {draftWarning && <div className="form-guidance" role="status">{draftWarning}</div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <footer className={`quiz-actions ${editing ? "editing-actions" : ""}`} aria-busy={saving}>
          {editing
            ? <button type="button" className="back-button" onClick={onCancel}><ArrowLeft /> Cancel</button>
            : step > 0
              ? <button type="button" className="back-button" onClick={() => setStep((value) => value - 1)}><ArrowLeft /> Back</button>
              : onExit
                ? <button type="button" className="back-button" onClick={onExit}><ArrowLeft /> Back to landing</button>
                : <span />}
          {editing ? (
            <button type="button" className="primary-button" disabled={saving} onClick={() => void finish()}>{saving ? "Saving…" : "Save changes"} {!saving && <Check />}</button>
          ) : step < steps.length - 1 ? (
            <button type="button" className="primary-button" aria-describedby={stepError ? "step-help" : undefined} disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continue <ArrowRight /></button>
          ) : (
            <button type="button" className="primary-button" disabled={!canContinue || saving} onClick={() => void finish()}>{saving ? "Saving…" : "Finish my profile"} {!saving && <Check />}</button>
          )}
        </footer>
      </section>
      <p className="save-note"><LockKeyhole /> {editing ? "Changes are not saved until you choose Save changes." : "Your progress is saved in this browser until setup is complete."}</p>
    </main>
  );
}
