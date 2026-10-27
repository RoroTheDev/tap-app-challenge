export interface ApiConfig {
  openAiApiKey: string;
  openAiModel: string;
  googleMapsApiKey: string;
  ticketmasterApiKey: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  twilioWhatsappFrom: string;
  twilioChannel: "sms" | "whatsapp";
  twilioWebhookUrl: string;
  twilioStatusCallbackUrl: string;
  webOrigin: string;
  allowMocks: boolean;
  port: number;
}

export function readConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  return {
    openAiApiKey: environment.OPENAI_API_KEY?.trim() ?? "",
    openAiModel: environment.OPENAI_MODEL?.trim() || "gpt-6-astra",
    googleMapsApiKey: environment.GOOGLE_MAPS_API_KEY?.trim() ?? "",
    ticketmasterApiKey: environment.TICKETMASTER_API_KEY?.trim() ?? "",
    twilioAccountSid: environment.TWILIO_ACCOUNT_SID?.trim() ?? "",
    twilioAuthToken: environment.TWILIO_AUTH_TOKEN?.trim() ?? "",
    twilioPhoneNumber: environment.TWILIO_PHONE_NUMBER?.trim() ?? "",
    twilioWhatsappFrom: environment.TWILIO_WHATSAPP_FROM?.trim() || "whatsapp:+14155238886",
    twilioChannel: environment.TWILIO_CHANNEL === "sms" ? "sms" : "whatsapp",
    twilioWebhookUrl: environment.TWILIO_WEBHOOK_URL?.trim() || "https://congressapp-849ff.web.app/api/twilio/incoming",
    twilioStatusCallbackUrl: environment.TWILIO_STATUS_CALLBACK_URL?.trim() || "https://congressapp-849ff.web.app/api/twilio/status",
    webOrigin:
      environment.WEB_ORIGIN?.trim() ||
      (environment.K_SERVICE ? "https://congressapp-849ff.web.app" : "http://localhost:5173"),
    allowMocks: environment.ALLOW_MOCKS === "true" || (environment.ALLOW_MOCKS === undefined && environment.NODE_ENV !== "production"),
    port: Number(environment.API_PORT) || 3001,
  };
}
