import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";

const openAiApiKey = defineSecret("OPENAI_API_KEY");
const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");
const twilioAccountSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioAuthToken = defineSecret("TWILIO_AUTH_TOKEN");

export const api = onRequest(
  {
    region: "us-west1",
    timeoutSeconds: 60,
    memory: "512MiB",
    secrets: [openAiApiKey, googleMapsApiKey, twilioAccountSid, twilioAuthToken],
  },
  createApp(readConfig()),
);
