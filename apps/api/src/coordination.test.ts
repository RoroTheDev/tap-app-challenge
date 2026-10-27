import { describe, expect, it } from "vitest";
import twilio from "twilio";
import { interpretCoordinationReply, normalizePhone, validateTwilioWebhook } from "./coordination.js";
import { readConfig } from "./config.js";

describe("coordination reply parser", () => {
  it("normalizes common US phone formats for Twilio", () => {
    expect(normalizePhone("(415) 555-0123")).toBe("+14155550123");
    expect(normalizePhone("+1 415 555 0123")).toBe("+14155550123");
  });

  it("rejects an invalid trusted-contact number", () => {
    expect(() => normalizePhone("123")).toThrow("not valid");
  });

  it.each(["YES", "yes I can", "Accept", "1"])("accepts %s", (reply) => {
    expect(interpretCoordinationReply(reply)).toBe("accepted");
  });

  it.each(["NO", "no sorry", "Declined", "2"])("declines %s", (reply) => {
    expect(interpretCoordinationReply(reply)).toBe("declined");
  });

  it.each(["maybe", "", "10", "yesterday"])("does not guess for %s", (reply) => {
    expect(interpretCoordinationReply(reply)).toBeNull();
  });

  it("accepts only a valid Twilio webhook signature", () => {
    const url = "https://example.com/api/twilio/incoming";
    const parameters = { From: "whatsapp:+15105550123", Body: "YES" };
    const config = readConfig({ TWILIO_AUTH_TOKEN: "test-auth-token", TWILIO_WEBHOOK_URL: url });
    const signature = twilio.getExpectedTwilioSignature(config.twilioAuthToken, url, parameters);
    expect(validateTwilioWebhook(signature, parameters, config)).toBe(true);
    expect(validateTwilioWebhook("invalid", parameters, config)).toBe(false);
  });
});
