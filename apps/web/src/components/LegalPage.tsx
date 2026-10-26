import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

export type LegalDocument = "privacy" | "terms";

interface LegalPageProps {
  document: LegalDocument;
  onBack: () => void;
  onSwitch: (document: LegalDocument) => void;
}

const effectiveDate = "October 25, 2026";

function LegalHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <>
    <header className="legal-header">
      <Logo />
      <button type="button" className="nav-link" onClick={onBack}><ArrowLeft /> Back to Cue</button>
    </header>
    <div className="legal-title">
      <div className="eyebrow"><ShieldCheck /> TRUST AND SAFETY</div>
      <h1>{title}</h1>
      <p>Effective {effectiveDate}</p>
    </div>
  </>;
}

function SafetyNotice() {
  return <aside className="legal-safety" role="note">
    <h2>Cue is not an emergency service</h2>
    <p>Do not use Cue to request emergency, medical, police, fire, or crisis assistance. Call 911 or the appropriate local emergency service when someone may be in immediate danger.</p>
  </aside>;
}

function PrivacyPolicy() {
  return <>
    <p className="legal-summary">Cue helps older adults turn everyday goals into plans involving places, activities, transportation, and people they trust. This policy explains what information Cue handles and the choices available to you.</p>
    <SafetyNotice />

    <section><h2>1. Information you provide</h2>
      <p>Depending on the features you choose, Cue may store:</p>
      <ul>
        <li>Account information, such as your name, email address, profile photo, and Firebase account identifier.</li>
        <li>Profile information, including phone number, birth year, preferred language, city, state, postal code, optional street address, interests, schedule preferences, transportation preferences, mobility information, and accessibility notes.</li>
        <li>Trusted-contact information, including a contact’s name, relationship, phone number, email address, permission status, and messaging preferences.</li>
        <li>Requests you submit, plans Cue prepares, confirmation status, and replies such as YES or NO from a trusted contact.</li>
      </ul>
      <p>Please provide another person’s information only with their knowledge and permission.</p>
    </section>

    <section><h2>2. Information handled automatically</h2>
      <p>Cue and its infrastructure may process basic technical information needed to operate and protect the service, such as timestamps, browser or device information, authentication events, request logs, error records, and approximate network information. Transportation and place features may use a location you provide or, with device permission, your current location.</p>
    </section>

    <section><h2>3. How Cue uses information</h2>
      <ul>
        <li>Authenticate your account and load your saved profile.</li>
        <li>Personalize activities, places, routes, timing, language, and fallback options.</li>
        <li>Prepare and, only after confirmation, send a message to an approved trusted contact.</li>
        <li>Operate, secure, debug, and improve Cue.</li>
        <li>Comply with applicable law and prevent misuse.</li>
      </ul>
    </section>

    <section><h2>4. AI planning and data minimization</h2>
      <p>Cue may use OpenAI to interpret a request and produce structured planning instructions. Cue is designed to send a reduced planning profile rather than the full stored profile. Exact street addresses, phone numbers, trusted-contact names, and contact email addresses are not included in the AI planning request. AI-generated suggestions can be incomplete or incorrect, so users should verify important details before acting.</p>
    </section>

    <section><h2>5. Services Cue works with</h2>
      <p>Cue uses service providers only for the features that require them:</p>
      <ul>
        <li><strong>Google Firebase</strong> for authentication, database storage, hosting, and server functions.</li>
        <li><strong>OpenAI</strong> for structured request interpretation and planning.</li>
        <li><strong>Google Maps Platform</strong> for places, routes, addresses, and travel estimates.</li>
        <li><strong>Twilio</strong> for SMS or WhatsApp messages and trusted-contact replies.</li>
        <li><strong>Ticketmaster</strong> for public event listings and official event links.</li>
        <li><strong>Uber</strong> when a user chooses to open a ride handoff. Uber receives information through its own app or website and applies its own privacy policy.</li>
      </ul>
      <p>Cue does not sell personal information. Links to third-party services are governed by those services’ terms and privacy practices.</p>
    </section>

    <section><h2>6. Trusted-contact messages</h2>
      <p>Cue does not message a trusted contact merely because a plan was created. The user reviews and confirms the message first unless a future feature presents and records a separate, clear authorization. Message providers and mobile carriers may retain delivery records under their own policies.</p>
    </section>

    <section><h2>7. Storage, security, and retention</h2>
      <p>Profiles and trusted contacts are protected by account-based access controls. Server-only coordination records are not readable by ordinary browser clients. Cue uses reasonable safeguards, but no internet service can guarantee absolute security. Information is kept while needed to provide the service, meet legal obligations, resolve disputes, and protect the service. Short-lived planning or confirmation records may expire earlier.</p>
    </section>

    <section><h2>8. Your choices</h2>
      <ul>
        <li>Edit optional profile fields and trusted contacts.</li>
        <li>Decline optional location or messaging permissions.</li>
        <li>Use typing when voice recognition is unavailable or unwanted.</li>
        <li>Delete profile and conductor data using Cue’s in-app deletion control.</li>
        <li>Stop using third-party links without completing the external action.</li>
      </ul>
      <p>Additional access, correction, export, or deletion rights may apply based on where you live.</p>
    </section>

    <section><h2>9. Children</h2>
      <p>Cue is designed for older adults and their support networks, not for children under 13. Cue does not knowingly request accounts from children under 13.</p>
    </section>

    <section><h2>10. Changes and contact</h2>
      <p>Material changes will be posted with a new effective date. Questions or privacy requests may be sent through the support method published in Cue.</p>
      <p className="legal-contact"><strong>Support contact:</strong> A monitored support address will be published before Cue leaves its prototype phase.</p>
    </section>
  </>;
}

function TermsOfUse() {
  return <>
    <p className="legal-summary">These terms govern use of Cue, a planning and coordination tool for everyday activities. By creating an account or using Cue, you agree to these terms.</p>
    <SafetyNotice />

    <section><h2>1. What Cue provides</h2>
      <p>Cue can suggest places, public events, routes, transportation handoffs, and trusted-contact messages. Cue is an assistance tool; it is not a transportation provider, event organizer, healthcare provider, caregiver, dispatcher, or emergency service.</p>
    </section>

    <section><h2>2. Eligibility and accounts</h2>
      <p>You must be able to form a binding agreement where you live or use Cue with the involvement of an authorized caregiver or representative. Keep account access secure and provide accurate information. Notify Cue’s support contact if you believe an account has been compromised.</p>
    </section>

    <section><h2>3. Permission and respectful use</h2>
      <p>Do not add or message a trusted contact without their knowledge and permission. Do not use Cue to harass, threaten, deceive, impersonate, surveil, send unlawful messages, interfere with the service, or violate another person’s rights. You are responsible for requests and confirmations made through your account.</p>
    </section>

    <section><h2>4. Verify plans before acting</h2>
      <p>AI suggestions, event listings, prices, schedules, accessibility details, routes, travel times, and availability may be incomplete, delayed, or wrong. Confirm important details with the venue, organizer, contact, transportation provider, or other official source. “Accessibility not confirmed” means Cue does not have enough reliable information and is not a representation that a location is accessible.</p>
    </section>

    <section><h2>5. Messaging</h2>
      <p>You control whether Cue sends a prepared trusted-contact message. Carrier, SMS, WhatsApp, and data charges may apply. Delivery and replies are not guaranteed. A lack of response must not be treated as agreement or as evidence that a person is safe.</p>
    </section>

    <section><h2>6. Transportation</h2>
      <p>Cue may open a third-party transportation service with trip information prefilled. You must review the destination, pickup, fare, vehicle, driver, timing, and safety information before confirming. Any ride is provided under the transportation provider’s terms. Cue does not select, employ, supervise, or guarantee drivers.</p>
    </section>

    <section><h2>7. Events and external services</h2>
      <p>Event and venue information may come from Google, Ticketmaster, municipalities, community organizations, or other official sources. Registration, payment, cancellation, refunds, admission, and participation are handled by the applicable organizer or service. External links do not mean Cue endorses or guarantees the third party.</p>
    </section>

    <section><h2>8. Availability and changes</h2>
      <p>Cue may change, suspend, or discontinue features, integrations, or access when reasonably necessary for maintenance, security, legal compliance, provider changes, or product development. Cue may restrict accounts that create risk or violate these terms.</p>
    </section>

    <section><h2>9. Ownership and feedback</h2>
      <p>Cue’s software, branding, and original content are protected by applicable intellectual-property laws. Third-party names and content belong to their respective owners. If you provide product feedback, Cue may use it to improve the service without an obligation to compensate you.</p>
    </section>

    <section><h2>10. Disclaimers and responsibility</h2>
      <p>Cue is provided on an “as available” basis to the extent permitted by law. Cue does not guarantee that a plan, message, event, route, or third-party service will be accurate, available, suitable, accessible, safe, or uninterrupted. Nothing in these terms excludes rights or responsibilities that cannot legally be excluded.</p>
    </section>

    <section><h2>11. Updates and contact</h2>
      <p>Updated terms will show a new effective date. Continued use after an update means you accept the updated terms where permitted by law.</p>
      <p className="legal-contact"><strong>Support contact:</strong> A monitored support address will be published before Cue leaves its prototype phase.</p>
    </section>
  </>;
}

export function LegalPage({ document, onBack, onSwitch }: LegalPageProps) {
  const isPrivacy = document === "privacy";
  return <div className="legal-shell">
    <LegalHeader title={isPrivacy ? "Privacy Policy" : "Terms of Use"} onBack={onBack} />
    <main className="legal-document">
      {isPrivacy ? <PrivacyPolicy /> : <TermsOfUse />}
      <nav className="legal-switch" aria-label="Legal documents">
        <button type="button" className="secondary-button" onClick={() => onSwitch(isPrivacy ? "terms" : "privacy")}>
          Read the {isPrivacy ? "Terms of Use" : "Privacy Policy"} <ExternalLink />
        </button>
        <button type="button" className="text-button" onClick={onBack}>Return to Cue</button>
      </nav>
    </main>
  </div>;
}
