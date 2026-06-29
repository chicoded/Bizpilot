"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white safe-area-pt"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
            <WifiOff className="h-4 w-4" />
            You&apos;re offline — some features may be unavailable
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
