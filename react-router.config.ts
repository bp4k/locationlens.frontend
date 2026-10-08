import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: auth state and user data are entirely client-side (token in
  // localStorage, profile fetched from the API), so there is nothing useful
  // to render on the server.
  ssr: false,
} satisfies Config;
