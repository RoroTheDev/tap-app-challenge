import type { SeniorProfile, TrustedContact } from "@tap/shared";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasEnoughPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function onboardingStepError(
  step: number,
  profile: SeniorProfile,
  contacts: TrustedContact[],
  currentYear = new Date().getFullYear(),
) {
  if (step === 0) {
    if (!profile.displayName.trim()) return "Please enter the name you would like TAP to use.";
    if (!profile.preferredLanguage) return "Please choose your preferred language.";
    if (profile.phone.trim() && !hasEnoughPhoneDigits(profile.phone)) return "Please enter a valid phone number, or leave it blank.";
    if (profile.birthYear !== null && (profile.birthYear < 1900 || profile.birthYear > currentYear)) return `Please enter a birth year from 1900 to ${currentYear}.`;
  }
  if (step === 1) {
    if (!profile.city.trim()) return "Please enter your city.";
    if (!profile.state.trim()) return "Please enter your state.";
    if (profile.postalCode.trim() && !/^[A-Za-z0-9 -]{3,12}$/.test(profile.postalCode.trim())) return "Please check your ZIP or postal code.";
  }
  if (step === 3) {
    for (const contact of contacts) {
      const hasAnyDetails = Boolean(contact.name.trim() || contact.relationship.trim() || contact.phone.trim() || contact.email.trim());
      if (!hasAnyDetails) continue;
      if (!contact.name.trim() || !contact.relationship.trim() || !contact.phone.trim()) return "Please add a name, relationship, and phone number for each contact—or remove the unfinished contact.";
      if (!hasEnoughPhoneDigits(contact.phone)) return `Please check the phone number for ${contact.name.trim()}.`;
      if (contact.email.trim() && !emailPattern.test(contact.email.trim())) return `Please check the email address for ${contact.name.trim()}.`;
      if (!contact.permissionConfirmed) return `Please confirm that ${contact.name.trim()} gave permission to save their contact information.`;
    }
  }
  if (step === 4 && !profile.personalizationConsent) return "Please agree to personalization to finish your profile.";
  return "";
}

