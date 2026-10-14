import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

// Exercise production browser bundles, avoiding dev-server compilation races.
const build = spawn(
  process.execPath,
  ["node_modules/@react-router/dev/bin.cjs", "build"],
  {
    stdio: ["ignore", "ignore", "inherit"],
    env: process.env,
  },
);
await new Promise((yes, no) => {
  build.on("error", no);
  build.on("exit", (code) =>
    code === 0 ? yes() : no(new Error(`Frontend build failed (${code})`)),
  );
});
const root = resolve("build/client");
const mime = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(400);
      return res.end();
    }
    if (!(await stat(file).catch(() => null))?.isFile())
      file = resolve(root, "index.html");
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(500);
    res.end("Test frontend unavailable");
  }
}).listen(Number(process.env.E2E_FRONTEND_PORT || 5173), "127.0.0.1");
