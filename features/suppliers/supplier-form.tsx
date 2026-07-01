"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/actions/suppliers";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";

export function SupplierForm({
  mode,
  supplierId,
  defaultValues,
  canDelete = false,
}: {
  mode: "create" | "edit";
  supplierId?: string;
  defaultValues?: {
    name: string;
    contact: string;
    email: string;
    address: string;
  };
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      contact: String(formData.get("contact") ?? "") || undefined,
      email: String(formData.get("email") ?? "") || undefined,
      address: String(formData.get("address") ?? "") || undefined,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSupplier(payload)
          : await updateSupplier(supplierId!, payload);

      if (result.error) {
        setError(
          typeof result.error === "string" ? result.error : "Could not save supplier"
        );
        return;
      }

      router.push(mode === "create" ? `/suppliers/${result.supplier!.id}` : "/suppliers");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!supplierId) return;
    if (
      !window.confirm(
        "Delete this supplier? Linked products will be unlinked but not deleted."
      )
    ) {
      return;
    }

    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteSupplier(supplierId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/suppliers");
      router.refresh();
    });
  }

  const busy = isPending || isDeleting;

  return (
    <>
      <Header
        title={mode === "create" ? "Add Supplier" : "Edit Supplier"}
      />
      <main className="p-4 md:p-6 max-w-lg mx-auto mobile-page">
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to suppliers
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
                  defaultValue={defaultValues?.name}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact person / phone</Label>
                <Input
                  id="contact"
                  name="contact"
                  type="tel"
                  defaultValue={defaultValues?.contact}
                  placeholder="08012345678 or contact name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={defaultValues?.email}
                  placeholder="supplier@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={defaultValues?.address}
                  placeholder="Street, city"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 rounded-lg bg-red-50 px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === "create" ? (
                  "Add Supplier"
                ) : (
                  "Save Changes"
                )}
              </Button>

              {mode === "edit" && canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={busy}
                  onClick={handleDelete}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Supplier
                    </>
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
