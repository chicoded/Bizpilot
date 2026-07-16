"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { NotificationCenter } from "@/components/layout/notification-center";
import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@/components/layout/command-palette";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <>
      <CommandPalette />
      <header className="sticky top-0 z-40 flex h-14 md:h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:px-6 safe-area-pt">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CommandPaletteTrigger />
          <NotificationCenter />
          <ThemeToggle />
          <ClerkLoading>
            <div
              className="h-9 w-9 animate-pulse rounded-full bg-muted"
              aria-hidden
            />
          </ClerkLoading>
          <ClerkLoaded>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />
          </ClerkLoaded>
        </div>
      </header>
    </>
  );
}
