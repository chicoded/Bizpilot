"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateRolePermissions,
  resetRolePermissions,
} from "@/actions/permissions";
import { Button } from "@/components/ui/button";
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

export function AccessControlPanel({ permissions }: AccessControlPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<RolePermissionsMap>(permissions);

  useEffect(() => {
    setDraft(permissions);
  }, [permissions]);

  function handleToggle(role: ConfigurableRole, section: AppSectionId) {
    setSaved(false);
    setDraft((prev) => toggleSection(prev, role, section));
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which app sections each role can open. Owners always have full
        access. Changes apply to all members with that role.
      </p>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold">Section</th>
              {CONFIGURABLE_ROLES.map((role) => (
                <th
                  key={role}
                  className="px-3 py-3 text-center font-semibold w-24"
                >
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APP_SECTIONS.map((section) => (
              <tr key={section.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{section.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {section.description}
                  </p>
                </td>
                {CONFIGURABLE_ROLES.map((role) => {
                  const checked = draft[role].includes(section.id);
                  return (
                    <td key={role} className="px-3 py-3 text-center">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggle(role, section.id)}
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors touch-manipulation",
                          checked
                            ? "border-biz-blue bg-biz-blue/10 text-brand dark:border-primary dark:bg-primary/15"
                            : "border-border bg-background text-muted-foreground hover:bg-accent"
                        )}
                        aria-label={`${checked ? "Revoke" : "Grant"} ${section.label} for ${ROLE_LABELS[role]}`}
                        aria-pressed={checked}
                      >
                        <Shield
                          className={cn("h-4 w-4", !checked && "opacity-40")}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm text-biz-emerald">Access settings saved.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={isPending}>
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
  );
}
