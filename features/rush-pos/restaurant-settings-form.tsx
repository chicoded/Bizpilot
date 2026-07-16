"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRestaurantSettings } from "@/actions/rush-pos";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Settings = {
  rushModeEnabled: boolean;
  voiceOrdersEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  comboMealsEnabled: boolean;
  kitchenDisplayEnabled: boolean;
};

export function RestaurantRushSettingsForm({
  settings,
}: {
  settings: Settings;
}) {
  const router = useRouter();
  const [values, setValues] = useState(settings);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof Settings) {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    setSaved(false);
    start(async () => {
      await updateRestaurantSettings(values);
      setSaved(true);
      router.refresh();
    });
  }

  const rows: { key: keyof Settings; label: string; hint: string }[] = [
    {
      key: "rushModeEnabled",
      label: "Enable Rush POS Engine",
      hint: "Large menu cards, floating checkout, under-5-second orders",
    },
    {
      key: "comboMealsEnabled",
      label: "Combo meals",
      hint: "One-tap meal bundles on the POS",
    },
    {
      key: "kitchenDisplayEnabled",
      label: "Kitchen display",
      hint: "Auto-create kitchen tickets after payment",
    },
    {
      key: "aiSuggestionsEnabled",
      label: "AI smart selling",
      hint: "Suggest sides and drinks based on past orders",
    },
    {
      key: "voiceOrdersEnabled",
      label: "Voice orders (beta)",
      hint: "Coming soon — speak Nigerian English orders into the cart",
    },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 className="text-lg font-semibold">Rush POS Engine</h2>
        <p className="text-sm text-muted-foreground">
          Built for restaurant and fast-food rush hours.
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <label
            key={row.key}
            className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/80 px-3 py-3"
          >
            <div>
              <Label className="text-sm font-medium">{row.label}</Label>
              <p className="text-xs text-muted-foreground">{row.hint}</p>
            </div>
            <input
              type="checkbox"
              className="mt-1 h-5 w-5"
              checked={values[row.key]}
              onChange={() => toggle(row.key)}
            />
          </label>
        ))}
      </div>
      {saved && (
        <p className="text-sm text-emerald-600">Restaurant settings saved</p>
      )}
      <Button type="button" onClick={save} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Rush settings"}
      </Button>
    </div>
  );
}
