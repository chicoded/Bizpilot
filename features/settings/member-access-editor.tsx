"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { updateMemberSectionOverrides } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import {
  AccessSectionList,
  accessCountLabel,
} from "@/features/settings/access-section-list";
import { Loader2, Shield, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import {
  APP_SECTIONS,
  getAllowedSections,
  hasCustomMemberAccess,
  parseMemberSectionOverrides,
  type AppSectionId,
  type RolePermissionsMap,
} from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/team";
import { cn } from "@/lib/utils";

interface MemberAccessEditorProps {
  membershipId: string;
  memberRole: Role;
  sectionOverrides: Prisma.JsonValue | null;
  rolePermissions: RolePermissionsMap;
}

export function MemberAccessEditor({
  membershipId,
  memberRole,
  sectionOverrides,
  rolePermissions,
}: MemberAccessEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const customEnabled = hasCustomMemberAccess(sectionOverrides);
  const [useCustom, setUseCustom] = useState(customEnabled);
  const roleDefaults = getAllowedSections(
    memberRole,
    rolePermissions,
    null
  );
  const [draft, setDraft] = useState<AppSectionId[]>(
    customEnabled
      ? (parseMemberSectionOverrides(sectionOverrides) ?? [])
      : roleDefaults
  );

  useEffect(() => {
    const enabled = hasCustomMemberAccess(sectionOverrides);
    setUseCustom(enabled);
    setDraft(
      enabled
        ? (parseMemberSectionOverrides(sectionOverrides) ?? [])
        : getAllowedSections(memberRole, rolePermissions, null)
    );
  }, [sectionOverrides, memberRole, rolePermissions]);

  const displayAllowed = useCustom ? draft : roleDefaults;
  const totalSections = APP_SECTIONS.length;

  function handleToggle(section: AppSectionId) {
    if (!useCustom) {
      setUseCustom(true);
    }
    setSaved(false);
    setDraft((prev) => {
      const base = useCustom ? prev : [...roleDefaults];
      const next = new Set(base);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return Array.from(next);
    });
  }

  function handleUseRoleDefaults() {
    setSaved(false);
    setUseCustom(false);
    setDraft(roleDefaults);
    startTransition(async () => {
      const result = await updateMemberSectionOverrides(membershipId, null);
      if (result.error) setError(result.error);
      else {
        setError(null);
        setSaved(true);
        router.refresh();
      }
    });
  }

  function handleSaveCustom() {
    setError(null);
    setSaved(false);
    setUseCustom(true);
    startTransition(async () => {
      const result = await updateMemberSectionOverrides(membershipId, draft);
      if (result.error) setError(result.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  const summaryLabel = customEnabled
    ? `Custom · ${accessCountLabel(displayAllowed.length, totalSections)}`
    : `${ROLE_LABELS[memberRole]} defaults · ${accessCountLabel(displayAllowed.length, totalSections)}`;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors touch-manipulation min-h-[48px]",
          expanded
            ? "border-brand/30 bg-brand/5 dark:border-primary/30 dark:bg-primary/10"
            : "border-border bg-card hover:bg-accent/50"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          {customEnabled ? (
            <Sparkles className="h-4 w-4 text-brand" />
          ) : (
            <Shield className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Page access</p>
          <p className="text-sm font-semibold truncate">{summaryLabel}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 rounded-xl border surface-muted p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {useCustom
              ? "Custom access for this person only — overrides their role defaults."
              : `Following ${ROLE_LABELS[memberRole]} role defaults. Tap a page to customize.`}
          </p>

          <AccessSectionList
            sections={APP_SECTIONS}
            allowed={useCustom ? draft : roleDefaults}
            onToggle={handleToggle}
            disabled={isPending}
          />

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="text-xs text-biz-emerald">Access saved.</p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto h-11"
              onClick={handleSaveCustom}
              disabled={isPending || !useCustom}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save custom access"
              )}
            </Button>
            {(customEnabled || useCustom) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto h-11"
                onClick={handleUseRoleDefaults}
                disabled={isPending}
              >
                Use role defaults
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
