"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBusiness } from "@/actions/business";
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
import { INDUSTRIES } from "@/types";
import { Loader2 } from "lucide-react";

interface BusinessProfileFormProps {
  business: {
    name: string;
    industry: string;
    currency: string;
    address: string | null;
    phone: string | null;
  };
}

export function BusinessProfileForm({ business }: BusinessProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [industry, setIndustry] = useState(business.industry);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    formData.set("industry", industry);

    startTransition(async () => {
      const result = await updateBusiness(formData);
      if (result.error) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Could not update profile"
        );
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" required defaultValue={business.name} />
      </div>
      <div className="space-y-2">
        <Label>Industry</Label>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Input id="currency" name="currency" defaultValue={business.currency} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={business.phone ?? ""}
          placeholder="Business phone number"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          defaultValue={business.address ?? ""}
          placeholder="Shop address"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-emerald-600 rounded-lg bg-emerald-50 px-3 py-2">
          Profile updated
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
      </Button>
    </form>
  );
}
