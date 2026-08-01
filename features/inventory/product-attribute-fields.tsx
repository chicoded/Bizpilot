"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { attributeInputName, productAttributeFields } from "@/lib/industries";
import { industryDisplayName } from "@/types";

const selectClasses = cn(
  "flex h-12 w-full rounded-xl border border-input bg-background text-foreground px-4 py-2 text-sm shadow-sm",
  "focus:outline-none focus:ring-2 focus:ring-biz-blue/30 dark:focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
);

/**
 * Renders the extra product fields this trade declares. A shop whose industry
 * pack declares none gets nothing at all, so the form is unchanged for them.
 */
export function ProductAttributeFields({
  industry,
  values,
  disabled,
}: {
  industry: string | null | undefined;
  values?: Record<string, unknown>;
  disabled?: boolean;
}) {
  const fields = productAttributeFields(industry);
  if (fields.length === 0) return null;

  const current = values ?? {};

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
      <p className="text-sm font-medium text-foreground">
        {industryDisplayName(industry ?? "OTHER")} details
      </p>

      {fields.map((field) => {
        const inputName = attributeInputName(field);
        const value = current[field.name];

        if (field.type === "boolean") {
          return (
            <label
              key={field.name}
              className="flex items-center gap-3 text-sm text-foreground"
            >
              <input
                type="checkbox"
                name={inputName}
                defaultChecked={value === true}
                disabled={disabled}
                className="h-5 w-5 rounded border-input accent-biz-blue dark:accent-primary"
              />
              {field.label}
            </label>
          );
        }

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={inputName}>
              {field.label}
              {field.required ? " *" : ""}
            </Label>

            {field.type === "select" ? (
              <select
                id={inputName}
                name={inputName}
                disabled={disabled}
                defaultValue={typeof value === "string" ? value : ""}
                className={selectClasses}
              >
                <option value="">Not set</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={inputName}
                name={inputName}
                disabled={disabled}
                required={field.required}
                defaultValue={
                  value === undefined || value === null ? "" : String(value)
                }
                placeholder={field.placeholder}
                autoComplete="off"
                {...(field.type === "number"
                  ? { inputMode: "numeric" as const, pattern: "[0-9]*" }
                  : {})}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
