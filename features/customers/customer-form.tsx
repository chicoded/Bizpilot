"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocalData } from "@/components/providers/local-data-provider";
import {
  createLocalCustomer,
  getLocalCustomer,
  updateLocalCustomer,
} from "@/lib/local-data/customers";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowLeft } from "lucide-react";

export function CustomerForm({
  mode,
  customerId,
  defaultValues,
}: {
  mode: "create" | "edit";
  customerId?: string;
  defaultValues?: { name: string; phone: string; email: string };
}) {
  const router = useRouter();
  const { businessId, status, refresh } = useLocalData();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [values, setValues] = useState({
    name: defaultValues?.name ?? "",
    phone: defaultValues?.phone ?? "",
    email: defaultValues?.email ?? "",
  });

  useEffect(() => {
    if (mode !== "edit" || !customerId || !businessId || status !== "ready") {
      return;
    }
    void (async () => {
      setLoading(true);
      const customer = await getLocalCustomer(businessId, customerId);
      if (customer) {
        setValues({
          name: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? "",
        });
      }
      setLoading(false);
    })();
  }, [mode, customerId, businessId, status]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!businessId) {
      setError("Shop data not loaded yet. Try again in a moment.");
      return;
    }

    const payload = {
      name: values.name,
      phone: values.phone || undefined,
      email: values.email || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createLocalCustomer(businessId, payload)
          : await updateLocalCustomer(businessId, customerId!, payload);

      if (!result) {
        setError("Could not save customer");
        return;
      }

      await refresh();
      router.push("/customers");
    });
  }

  if (loading) {
    return (
      <>
        <Header title={mode === "create" ? "Add Customer" : "Edit Customer"} />
        <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        title={mode === "create" ? "Add Customer" : "Edit Customer"}
      />
      <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </Link>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={values.name}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={values.phone}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="08012345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="customer@email.com"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "create" ? (
                  "Add Customer"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
