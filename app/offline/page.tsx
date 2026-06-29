"use client";

import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white safe-area-pt safe-area-pb">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 mb-6">
        <WifiOff className="h-10 w-10 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold text-biz-blue mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground text-center max-w-sm mb-8">
        BizPilot needs internet for sales and sync. Check your connection and try
        again.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          className="w-full h-14"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-5 w-5" />
          Try Again
        </Button>
        <Link href="/dashboard" className="w-full">
          <Button variant="outline" size="lg" className="w-full h-14">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
