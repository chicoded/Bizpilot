import type { Appearance } from "@clerk/types";

/** Clerk UI that respects site light / night mode via CSS variables. */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#1e3a5f",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "mx-auto",
    card: "shadow-glass rounded-2xl !bg-card !text-card-foreground border border-border",
    headerTitle: "!text-foreground",
    headerSubtitle: "!text-muted-foreground",
    socialButtonsBlockButton:
      "!bg-background !border-border !text-foreground hover:!bg-accent",
    formFieldLabel: "!text-foreground",
    formFieldInput:
      "!bg-background !border-border !text-foreground focus:!ring-ring",
    footerActionLink: "!text-primary hover:!text-primary/80",
    identityPreviewText: "!text-foreground",
    identityPreviewEditButton: "!text-primary",
  },
};
