"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { updateMemberSectionOverrides } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, ChevronDown, ChevronUp } from "lucide-react";
import {
  APP_SECTIONS,
  getAllowedSections,
  hasCustomMemberAccess,
  parseMemberSectionOverrides,
  parseRolePermissions,
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

  function handleToggle(section: AppSectionId) {
    setSaved(false);
    setDraft((prev) => {
      const next = new Set(prev);
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

  return (
    <div className="w-full sm:max-w-md">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 text-xs font-medium text-biz-blue hover:underline"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Hide custom access
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            {customEnabled ? "Custom access" : "Customize access"}
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-3 rounded-xl border bg-slate-50/80 p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Override {ROLE_LABELS[memberRole]} role defaults for this person
            only.
          </p>

          <div className="grid gap-1.5 max-h-48 overflow-y-auto">
            {APP_SECTIONS.map((section) => {
              const checked = draft.includes(section.id);
              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={isPending || !useCustom}
                  onClick={() => handleToggle(section.id)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    useCustom
                      ? checked
                        ? "border-biz-blue bg-biz-blue/10"
                        : "border-border bg-white hover:bg-accent"
                      : "border-border bg-white/60 opacity-70"
                  )}
                >
                  <span>{section.label}</span>
                  <Shield
                    className={cn(
                      "h-4 w-4",
                      checked ? "text-biz-blue" : "text-muted-foreground/40"
                    )}
                  />
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="text-xs text-biz-emerald">Access saved.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCustom}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save custom access"
              )}
            </Button>
            {customEnabled && (
              <Button
                type="button"
                size="sm"
                variant="outline"
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
