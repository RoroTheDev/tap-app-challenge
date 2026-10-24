import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules[\\/](@firebase[\\/]firestore|firebase[\\/]firestore|@firebase[\\/]webchannel)/.test(id)) return "firebase-firestore";
          if (/node_modules[\\/](@firebase[\\/]auth|firebase[\\/]auth)/.test(id)) return "firebase-auth";
          if (id.includes("node_modules/lucide-react")) return "icons";
          if (id.includes("node_modules/react")) return "react";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
