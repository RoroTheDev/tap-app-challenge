import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = environment.VITE_API_PROXY_TARGET || "http://localhost:3001";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { "/api": { target: apiProxyTarget, changeOrigin: true } },
    },
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
  };
});
