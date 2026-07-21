import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { prepareRegistryConsumer } from "./test-registry-consumer.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const portIndex = process.argv.indexOf("--port");
const port = portIndex === -1 ? "4173" : process.argv[portIndex + 1];

if (!port || !/^\d+$/.test(port)) {
  throw new Error("--port must be followed by a numeric port");
}

const prepared = await prepareRegistryConsumer(root);
let server;
let stopping = false;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server?.kill("SIGTERM");
  await prepared.cleanup();
  process.exit(code);
}

try {
  await access(
    join(prepared.consumer, "src/components/afferent/admin/admin-screen.tsx"),
  );
  server = spawn(
    join(prepared.consumer, "node_modules/.bin/vite"),
    ["preview", "--host", "127.0.0.1", "--port", port, "--strictPort"],
    { cwd: prepared.consumer, stdio: "inherit" },
  );
  server.once("error", async (error) => {
    console.error(error);
    await stop(1);
  });
  server.once("exit", async (code, signal) => {
    if (!stopping) {
      console.error(`Evidence server exited (${code ?? signal})`);
      await stop(code ?? 1);
    }
  });
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
} catch (error) {
  console.error(error);
  await stop(1);
}
