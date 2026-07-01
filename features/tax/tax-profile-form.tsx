"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaxProfile } from "@/actions/tax";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ANNUAL_REVENUE_BANDS,
  NIGERIAN_STATES,
  TAX_BUSINESS_TYPE_LABELS,
} from "@/lib/tax/constants";
import { TaxDisclaimer } from "@/components/tax/tax-disclaimer";
import { Loader2 } from "lucide-react";
import type { BusinessTaxProfile, TaxBusinessType } from "@prisma/client";

interface TaxProfileFormProps {
  profile: BusinessTaxProfile | null;
}

export function TaxProfileForm({ profile }: TaxProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [businessType, setBusinessType] = useState<TaxBusinessType>(
    profile?.businessType ?? "OTHER"
  );
  const [state, setState] = useState(profile?.state ?? "");
  const [registeredBusiness, setRegisteredBusiness] = useState(
    profile?.registeredBusiness ?? false
  );
  const [tin, setTin] = useState(profile?.tin ?? "");
  const [vatRegistered, setVatRegistered] = useState(
    profile?.vatRegistered ?? false
  );
  const [vatEnabled, setVatEnabled] = useState(profile?.vatEnabled ?? false);
  const [vatPricingMode, setVatPricingMode] = useState<
    "INCLUSIVE" | "EXCLUSIVE"
  >(profile?.vatPricingMode ?? "EXCLUSIVE");
  const [annualRevenueBand, setAnnualRevenueBand] = useState(
    profile?.annualRevenueBand ?? ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateTaxProfile({
        businessType,
        state,
        registeredBusiness,
        tin: tin || undefined,
        vatRegistered,
        vatEnabled: vatRegistered ? vatEnabled : false,
        vatPricingMode,
        annualRevenueBand,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TaxDisclaimer />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Is your business registered (CAC)?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={registeredBusiness ? "default" : "outline"}
                onClick={() => setRegisteredBusiness(true)}
                disabled={isPending}
              >
                CAC registered
              </Button>
              <Button
                type="button"
                variant={!registeredBusiness ? "default" : "outline"}
                onClick={() => setRegisteredBusiness(false)}
                disabled={isPending}
              >
                Not registered
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tin">TIN (Tax Identification Number)</Label>
            <Input
              id="tin"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              placeholder="Optional"
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="business-type">Business type</Label>
            <select
              id="business-type"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as TaxBusinessType)}
              disabled={isPending}
              className="w-full h-11 rounded-lg border px-3 text-sm bg-white"
            >
              {Object.entries(TAX_BUSINESS_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
              disabled={isPending}
              className="w-full h-11 rounded-lg border px-3 text-sm bg-white"
            >
              <option value="">Select state...</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revenue-band">Annual revenue (estimate)</Label>
            <select
              id="revenue-band"
              value={annualRevenueBand}
              onChange={(e) => setAnnualRevenueBand(e.target.value)}
              required
              disabled={isPending}
              className="w-full h-11 rounded-lg border px-3 text-sm bg-white"
            >
              <option value="">Select band...</option>
              {ANNUAL_REVENUE_BANDS.map((band) => (
                <option key={band.value} value={band.value}>
                  {band.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">VAT settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>VAT registered with FIRS?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={vatRegistered ? "default" : "outline"}
                onClick={() => setVatRegistered(true)}
                disabled={isPending}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={!vatRegistered ? "default" : "outline"}
                onClick={() => {
                  setVatRegistered(false);
                  setVatEnabled(false);
                }}
                disabled={isPending}
              >
                No
              </Button>
            </div>
          </div>

          {vatRegistered && (
            <>
              <div className="space-y-2">
                <Label>Apply VAT on sales (estimates)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={vatEnabled ? "default" : "outline"}
                    onClick={() => setVatEnabled(true)}
                    disabled={isPending}
                  >
                    Enabled
                  </Button>
                  <Button
                    type="button"
                    variant={!vatEnabled ? "default" : "outline"}
                    onClick={() => setVatEnabled(false)}
                    disabled={isPending}
                  >
                    Disabled
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat-mode">Pricing mode</Label>
                <select
                  id="vat-mode"
                  value={vatPricingMode}
                  onChange={(e) =>
                    setVatPricingMode(e.target.value as "INCLUSIVE" | "EXCLUSIVE")
                  }
                  disabled={isPending || !vatEnabled}
                  className="w-full h-11 rounded-lg border px-3 text-sm bg-white"
                >
                  <option value="EXCLUSIVE">VAT exclusive (add VAT at checkout)</option>
                  <option value="INCLUSIVE">VAT inclusive (prices include VAT)</option>
                </select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Tax profile saved. Estimates will update from your records.
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save tax profile"}
      </Button>
    </form>
  );
}
