import { createApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
createApp(config).listen(config.port, () => {
  console.log(`TAP conductor listening on http://localhost:${config.port}`);
});
