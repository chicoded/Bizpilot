/**
 * Hybrid cloud status: prefer Supabase when awake; fall back to local IndexedDB when sleeping/unreachable.
 */

export type CloudStatus = "online" | "sleeping" | "offline" | "unknown";

export type CloudPingResult = {
  status: CloudStatus;
  latencyMs: number;
  message: string;
};

const WAKE_ATTEMPTS = 3;
const WAKE_DELAY_MS = 1200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ping /api/health. Retries a few times to wake a paused Supabase project.
 */
export async function pingCloudDatabase(
  options?: { wake?: boolean }
): Promise<CloudPingResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      status: "offline",
      latencyMs: 0,
      message: "Device offline - using local storage",
    };
  }

  const attempts = options?.wake === false ? 1 : WAKE_ATTEMPTS;
  let lastLatency = 0;

  for (let i = 0; i < attempts; i++) {
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("/api/health", {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);
      lastLatency = Date.now() - started;

      if (res.ok) {
        return {
          status: "online",
          latencyMs: lastLatency,
          message:
            i > 0
              ? `Cloud woke up (${lastLatency}ms)`
              : `Cloud online (${lastLatency}ms)`,
        };
      }

      // 503 often means DB/schema down (including cold start race)
      if (res.status === 503 && i < attempts - 1) {
        await sleep(WAKE_DELAY_MS * (i + 1));
        continue;
      }

      return {
        status: "sleeping",
        latencyMs: lastLatency,
        message: "Cloud unavailable - using local storage",
      };
    } catch {
      lastLatency = Date.now() - started;
      if (i < attempts - 1) {
        await sleep(WAKE_DELAY_MS * (i + 1));
        continue;
      }
    }
  }

  return {
    status: "sleeping",
    latencyMs: lastLatency,
    message: "Cloud sleeping/unreachable - selling from local storage",
  };
}

export function isCloudUsable(status: CloudStatus) {
  return status === "online";
}
