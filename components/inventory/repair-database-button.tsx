"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RepairDatabaseButtonProps {
  onSuccess?: () => void;
  label?: string;
  variant?: "default" | "outline" | "secondary";
}

export function RepairDatabaseButton({
  onSuccess,
  label = "Fix Database",
  variant = "default",
}: RepairDatabaseButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleRepair() {
    setMessage(null);
    setFailed(false);

    try {
      const res = await fetch("/api/schema/repair", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        stillMissing?: string[];
      };

      if (data.ok) {
        setMessage(data.message ?? "Database updated successfully.");
        startTransition(() => {
          onSuccess?.();
          router.refresh();
        });
        return;
      }

      setFailed(true);
      setMessage(
        data.message ??
          `Repair failed${
            data.stillMissing?.length
              ? `: still missing ${data.stillMissing.join(", ")}`
              : ""
          }.`
      );
    } catch {
      setFailed(true);
      setMessage("Could not reach the repair service. Try again.");
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={variant}
        onClick={() => handleRepair()}
        disabled={isPending}
        className="w-full sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Fixing database…
          </>
        ) : (
          label
        )}
      </Button>
      {message && (
        <p
          className={`text-sm px-3 py-2 rounded-lg ${
            failed
              ? "text-red-700 bg-red-50"
              : "text-green-700 bg-green-50"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
