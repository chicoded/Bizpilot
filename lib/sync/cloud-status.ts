/**
 * Hybrid cloud status: prefer Supabase when awake; fall back to local IndexedDB when sleeping/unreachable.
 */

export type CloudStatus = "online" | "sleeping" | "offline" | "unknown";

export type CloudPingResult = {
  status: CloudStatus;
  latencyMs: number;
  message: string;
};

const QUIET_ATTEMPTS = 1;
const WAKE_ATTEMPTS = 3;
const KICKSTART_ATTEMPTS = 8;
const WAKE_DELAY_MS = 1500;
const KICKSTART_DELAY_MS = 2500;

type Listener = (result: CloudPingResult) => void;

let lastResult: CloudPingResult = {
  status: "unknown",
  latencyMs: 0,
  message: "Checking cloud database…",
};
const listeners = new Set<Listener>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function publish(result: CloudPingResult) {
  lastResult = result;
  listeners.forEach((listener) => listener(result));
}

export function getLastCloudStatus(): CloudPingResult {
  return lastResult;
}

export function subscribeCloudStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(lastResult);
  return () => listeners.delete(listener);
}

export function isCloudUsable(status: CloudStatus) {
  return status === "online";
}

/**
 * Ping /api/health. Use wake/kickstart to retry while Supabase cold-starts.
 */
export async function pingCloudDatabase(
  options?: { wake?: boolean; kickstart?: boolean; silent?: boolean }
): Promise<CloudPingResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const result: CloudPingResult = {
      status: "offline",
      latencyMs: 0,
      message: "Device offline — selling from this phone until you reconnect",
    };
    if (!options?.silent) publish(result);
    return result;
  }

  const kickstart = options?.kickstart === true;
  const wake = kickstart || options?.wake !== false;
  const attempts = kickstart
    ? KICKSTART_ATTEMPTS
    : wake
      ? WAKE_ATTEMPTS
      : QUIET_ATTEMPTS;
  const delayMs = kickstart ? KICKSTART_DELAY_MS : WAKE_DELAY_MS;
  const timeoutMs = kickstart ? 20_000 : 8_000;
  let lastLatency = 0;

  for (let i = 0; i < attempts; i++) {
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch("/api/health", {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);
      lastLatency = Date.now() - started;

      if (res.ok) {
        const result: CloudPingResult = {
          status: "online",
          latencyMs: lastLatency,
          message:
            i > 0
              ? `Cloud database woke up (${lastLatency}ms)`
              : `Cloud database online (${lastLatency}ms)`,
        };
        if (!options?.silent) publish(result);
        return result;
      }

      if ((res.status === 503 || res.status >= 500) && i < attempts - 1) {
        await sleep(delayMs * Math.min(i + 1, 3));
        continue;
      }

      const result: CloudPingResult = {
        status: "sleeping",
        latencyMs: lastLatency,
        message:
          "Cloud database is sleeping or unreachable. Sales still work on this device.",
      };
      if (!options?.silent) publish(result);
      return result;
    } catch {
      lastLatency = Date.now() - started;
      if (i < attempts - 1) {
        await sleep(delayMs * Math.min(i + 1, 3));
        continue;
      }
    }
  }

  const result: CloudPingResult = {
    status: "sleeping",
    latencyMs: lastLatency,
    message:
      "Cloud database did not wake in time. Tap Wake database to try again, or keep selling locally.",
  };
  if (!options?.silent) publish(result);
  return result;
}

/** Aggressive wake for the "Wake database" button. */
export async function kickstartCloudDatabase(): Promise<CloudPingResult> {
  publish({
    status: "unknown",
    latencyMs: 0,
    message: "Waking cloud database… this can take up to a minute",
  });
  return pingCloudDatabase({ kickstart: true });
}
