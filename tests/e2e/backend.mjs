import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";

// Keep backend and frontend checkouts beside each other, or set these paths.
// Build the backend first: mvnw -DskipTests package. JAVA_HOME must be JDK 21+.
const backend = resolve(process.env.E2E_BACKEND_DIR || "../locationlens");
const jar = resolve(
  process.env.E2E_BACKEND_JAR ||
    join(backend, "target/locationlens-0.0.1-SNAPSHOT.jar"),
);
if (!existsSync(jar))
  throw new Error(
    "Build the backend with mvnw -DskipTests package before running test:e2e.",
  );
const java = process.env.JAVA_HOME
  ? join(
      process.env.JAVA_HOME,
      "bin",
      process.platform === "win32" ? "java.exe" : "java",
    )
  : "java";
const child = spawn(java, ["-jar", jar], {
  cwd: backend,
  stdio: "inherit",
  env: {
    ...process.env,
    SERVER_ADDRESS: "127.0.0.1",
    SERVER_PORT: "9080",
    IDP_URI: "http://127.0.0.1:9084",
    IDP_CLIENT_ID: "e2e-client",
    IDP_CLIENT_SECRET: "fixture-secret",
    VALID_REDIRECTS: `http://127.0.0.1:${process.env.E2E_FRONTEND_PORT || 5173}/login-redirect`,
    GOOGLE_PLACES_API_KEY: "fixture-key",
    GOOGLE_PLACES_BASE_URL: "http://127.0.0.1:9084/v1",
    DB_URL: "jdbc:h2:mem:claim-e2e",
    DB_USER: "sa",
    DB_PASS: "",
    SPRING_JPA_HIBERNATE_DDL_AUTO: "create-drop",
    LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_SECURITY: "OFF",
  },
});
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    child.kill();
  });
}
