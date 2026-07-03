"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  updateRolePermissions,
  resetRolePermissions,
} from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  AccessSectionList,
  accessCountLabel,
} from "@/features/settings/access-section-list";
import { Loader2, RotateCcw, Shield } from "lucide-react";
import {
  APP_SECTIONS,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  type AppSectionId,
  type ConfigurableRole,
  type RolePermissionsMap,
} from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/team";
import { cn } from "@/lib/utils";

interface AccessControlPanelProps {
  permissions: RolePermissionsMap;
}

const ROLE_HINTS: Record<ConfigurableRole, string> = {
  MANAGER: "Full operations except billing — ideal for shop supervisors.",
  CASHIER: "POS, customers, and debts — for front-desk staff.",
  STAFF: "Dashboard and inventory — for stock handlers.",
};

function toggleSection(
  current: RolePermissionsMap,
  role: ConfigurableRole,
  section: AppSectionId
): RolePermissionsMap {
  const sections = new Set(current[role]);
  if (sections.has(section)) {
    sections.delete(section);
  } else {
    sections.add(section);
  }
  return { ...current, [role]: Array.from(sections) };
}

function permissionsEqual(a: RolePermissionsMap, b: RolePermissionsMap) {
  return CONFIGURABLE_ROLES.every((role) => {
    const setA = new Set(a[role]);
    const setB = new Set(b[role]);
    if (setA.size !== setB.size) return false;
    return [...setA].every((id) => setB.has(id));
  });
}

export function AccessControlPanel({ permissions }: AccessControlPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<RolePermissionsMap>(permissions);
  const [activeRole, setActiveRole] = useState<ConfigurableRole>("MANAGER");

  useEffect(() => {
    setDraft(permissions);
  }, [permissions]);

  const isDirty = useMemo(
    () => !permissionsEqual(draft, permissions),
    [draft, permissions]
  );

  const activeAllowed = draft[activeRole];
  const totalSections = APP_SECTIONS.length;

  function handleToggle(role: ConfigurableRole, section: AppSectionId) {
    setSaved(false);
    setDraft((prev) => toggleSection(prev, role, section));
  }

  function grantAll(role: ConfigurableRole) {
    setSaved(false);
    setDraft((prev) => ({
      ...prev,
      [role]: APP_SECTIONS.map((s) => s.id),
    }));
  }

  function clearAll(role: ConfigurableRole) {
    setSaved(false);
    setDraft((prev) => ({
      ...prev,
      [role]: [],
    }));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateRolePermissions(draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function handleReset() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await resetRolePermissions();
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft(DEFAULT_ROLE_PERMISSIONS);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 pb-28 md:pb-0">
      <p className="text-sm text-muted-foreground">
        Choose which pages each role can open. Owners always have full access.
        Changes apply to everyone with that role.
      </p>

      <SegmentedControl
        label="Role"
        value={activeRole}
        onChange={setActiveRole}
        options={CONFIGURABLE_ROLES.map((role) => ({
          value: role,
          label: ROLE_LABELS[role],
        }))}
        className="grid grid-cols-3 gap-1.5 [&>button]:w-full [&>button]:px-2 [&>button]:text-xs sm:[&>button]:text-sm sm:[&>button]:px-4"
      />

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand shrink-0" />
              <p className="font-semibold">{ROLE_LABELS[activeRole]}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ROLE_HINTS[activeRole]}
            </p>
            <p className="text-sm font-medium text-brand mt-2">
              {accessCountLabel(activeAllowed.length, totalSections)} allowed
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => grantAll(activeRole)}
              className="flex-1 sm:flex-none h-10"
            >
              Allow all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => clearAll(activeRole)}
              className="flex-1 sm:flex-none h-10"
            >
              Clear all
            </Button>
          </div>
        </div>

        <AccessSectionList
          sections={APP_SECTIONS}
          allowed={activeAllowed}
          onToggle={(sectionId) => handleToggle(activeRole, sectionId)}
          disabled={isPending}
        />
      </div>

      {/* Desktop: inline actions */}
      <div className="hidden md:block space-y-3">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="text-sm text-biz-emerald">Access settings saved.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={isPending || !isDirty}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save access settings"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to defaults
          </Button>
        </div>
      </div>

      {/* Mobile: sticky save bar when there are unsaved changes */}
      <div
        className={cn(
          "fixed left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-xl px-4 py-3 safe-area-pb transition-transform duration-200",
          isDirty
            ? "bottom-[4.5rem] translate-y-0"
            : "bottom-[4.5rem] translate-y-full pointer-events-none"
        )}
      >
        {error && (
          <p className="text-xs text-destructive mb-2" role="alert">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="text-xs text-biz-emerald mb-2">Access settings saved.</p>
        )}
        <div className="flex gap-2">
          <Button
            className="flex-1 h-12"
            onClick={handleSave}
            disabled={isPending || !isDirty}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save changes"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 px-3"
            onClick={handleReset}
            disabled={isPending}
            aria-label="Reset to defaults"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile: show saved message when bar is hidden */}
      {!isDirty && saved && !error && (
        <p className="text-sm text-biz-emerald md:hidden">Access settings saved.</p>
      )}
      {!isDirty && error && (
        <p className="text-sm text-destructive md:hidden" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
