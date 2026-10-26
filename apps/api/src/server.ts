import { createApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
createApp(config).listen(config.port, () => {
  console.log(`Cue conductor listening on http://localhost:${config.port}`);
});
