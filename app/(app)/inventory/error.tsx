"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RepairDatabaseButton } from "@/components/inventory/repair-database-button";

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Inventory error:", error.digest ?? error.message);
  }, [error]);

  const detail = error.message || error.digest || "Unknown error";
  const schemaMismatch =
    /imageUrl|unitsPerPack|schema|column|products table|P2022|digest/i.test(
      detail
    ) || Boolean(error.digest);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold text-brand mb-2">
        Could not load inventory
      </h1>
      <p className="text-muted-foreground max-w-md mb-4">
        {schemaMismatch
          ? "Database update required. Your products table may be missing optional columns."
          : "Something went wrong loading your products."}
      </p>
      {schemaMismatch && (
        <p className="text-sm text-muted-foreground max-w-lg mb-4 font-mono bg-muted px-3 py-2 rounded-lg break-all text-left">
          Run database/repair-product-schema.sql in Supabase, or tap Fix Database
          below (owner only).
        </p>
      )}
      <p className="text-xs text-muted-foreground max-w-lg mb-6 font-mono bg-muted px-3 py-2 rounded-lg break-all">
        {detail}
      </p>
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <RepairDatabaseButton onSuccess={() => reset()} />
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Button variant="outline" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
