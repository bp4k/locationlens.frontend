import { defineConfig, devices } from "@playwright/test";

// Fixed loopback ports make the OIDC issuer, callback allow-list, and CORS
// origins reproducible. These fixtures never call real Google/Keycloak services.
const frontendPort = process.env.E2E_FRONTEND_PORT || "5173";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${frontendPort}`, ...devices["Desktop Chrome"] },
  webServer: [
    {
      command: "node tests/e2e/provider.mjs",
      url: "http://127.0.0.1:9084/health",
      reuseExistingServer: false,
    },
    {
      command: "node tests/e2e/backend.mjs",
      url: "http://127.0.0.1:9080/",
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: "node tests/e2e/frontend.mjs",
      url: `http://127.0.0.1:${frontendPort}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        VITE_APP_API_URL: "http://127.0.0.1:9080/api",
        VITE_GOOGLE_MAPS_API_KEY: "",
        VITE_IDP_URI: "",
        VITE_IDP_CLIENT_ID: "",
      },
    },
  ],
});
