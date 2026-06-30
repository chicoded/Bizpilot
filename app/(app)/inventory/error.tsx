"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "checking" | "fixed" | "failed">(
    "idle"
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.error("Inventory error:", error.digest ?? error.message);
  }, [error]);

  async function repairSchema() {
    setStatus("checking");
    try {
      const res = await fetch("/api/schema/repair", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean };
      if (data.ok) {
        setStatus("fixed");
        startTransition(() => reset());
        return;
      }
      setStatus("failed");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold text-biz-blue mb-2">
        Could not load inventory
      </h1>
      <p className="text-muted-foreground max-w-md mb-4">
        Your database may be missing a column for product photos. Click below to
        fix it automatically, or run this in Supabase → SQL Editor:
      </p>
      <p className="text-sm text-muted-foreground max-w-lg mb-6 font-mono bg-muted px-3 py-2 rounded-lg text-left break-all">
        ALTER TABLE &quot;products&quot; ADD COLUMN IF NOT EXISTS &quot;imageUrl&quot;
        TEXT;
      </p>

      {status === "fixed" && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-4">
          Database updated — reloading inventory…
        </p>
      )}
      {status === "failed" && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4 max-w-md">
          Auto-fix failed. Copy the SQL above into Supabase SQL Editor, run it,
          then click Try again.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => repairSchema()}
          disabled={status === "checking" || isPending}
        >
          {status === "checking" || isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Fixing…
            </>
          ) : (
            "Fix database automatically"
          )}
        </Button>
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
