"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBusiness } from "@/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { INDUSTRIES } from "@/types";
import { Loader2 } from "lucide-react";

export function OnboardingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [industry, setIndustry] = useState("RETAIL");
  const [currency, setCurrency] = useState("NGN");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("industry", industry);
    formData.set("currency", currency);

    startTransition(async () => {
      const result = await createBusiness(formData);
      if (result.error) {
        const formErrors =
          "_form" in result.error ? result.error._form : undefined;
        if (Array.isArray(formErrors) && formErrors[0]) {
          setError(formErrors[0]);
          return;
        }
        const fieldErrors = Object.values(result.error)
          .flat()
          .filter((v): v is string => typeof v === "string");
        setError(
          fieldErrors[0] ?? "Please check your inputs and try again."
        );
        return;
      }
      // Full navigation so this device drops any stale empty-shop local data.
      window.location.assign("/dashboard");
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Ade Pharmacy"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select value={industry} onValueChange={setIndustry} required>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">Nigerian Naira (₦)</SelectItem>
                <SelectItem value="GHS">Ghanaian Cedi (₵)</SelectItem>
                <SelectItem value="KES">Kenyan Shilling (KSh)</SelectItem>
                <SelectItem value="ZAR">South African Rand (R)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="e.g. 08012345678"
            />
            <p className="text-xs text-muted-foreground">
              So we can reach you about your shop account.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Input
              id="address"
              name="address"
              placeholder="Shop address"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              "Launch Zaplex"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
