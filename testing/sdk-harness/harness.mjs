import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import fs from "node:fs";
import path from "node:path";

const target = process.env.TEST_TARGET || "emulator";
const projectId = process.env.FIREBASE_PROJECT_ID || "demo-housing-finder";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, "us-central1");

if (target === "emulator") {
  connectAuthEmulator(auth, process.env.AUTH_EMULATOR_URL || "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFunctionsEmulator(functions, "127.0.0.1", Number(process.env.FUNCTIONS_EMULATOR_PORT || 5001));
}

function nowMs() {
  return Date.now();
}

async function measure(flow, fn) {
  const start = nowMs();
  try {
    await fn();
    return { flow, success: true, latencyMs: nowMs() - start };
  } catch (error) {
    return {
      flow,
      success: false,
      latencyMs: nowMs() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function run() {
  const email = process.env.HARNESS_EMAIL;
  const password = process.env.HARNESS_PASSWORD;

  if (!email || !password) {
    throw new Error("HARNESS_EMAIL and HARNESS_PASSWORD are required.");
  }

  const metrics = [];

  metrics.push(
    await measure("signin", async () => {
      await signInWithEmailAndPassword(auth, email, password);
    })
  );

  const getCalendarEvents = httpsCallable(functions, "getCalendarEvents");
  metrics.push(
    await measure("get-calendar-events", async () => {
      await getCalendarEvents({ role: "agent", activeOfferId: null });
    })
  );

  const payload = {
    timestamp: new Date().toISOString(),
    target,
    runId: `${Date.now()}`,
    phases: [
      {
        phase: "main",
        metrics,
      },
    ],
  };

  const outputPath = path.resolve("harness-results.json");
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote harness results to ${outputPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
