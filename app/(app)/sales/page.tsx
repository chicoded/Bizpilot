"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createSale } from "@/actions/business";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";
import {
  CreditCustomerPicker,
  type CustomerOption,
} from "@/features/sales/credit-customer-picker";
import {
  ScanProductButton,
  type ScannableProduct,
} from "@/features/sales/scan-product-button";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Check,
  Loader2,
  History,
  FileText,
  Printer,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
  barcode?: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [saleError, setSaleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => {});
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data.customers ?? []))
      .catch(() => {});
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search)
  );

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  function addToCart(product: Product | ScannableProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function completeSale() {
    if (cart.length === 0) return;
    if (paymentMethod === "CREDIT" && !customerId) {
      setSaleError("Select a customer for credit sales");
      return;
    }
    setSaleError(null);
    startTransition(async () => {
      const result = await createSale({
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        paymentMethod,
        customerId: paymentMethod === "CREDIT" ? customerId : undefined,
        isCredit: paymentMethod === "CREDIT",
      });
      if (result.success) {
        setCart([]);
        setCustomerId("");
        setSaleComplete(true);
        setLastSaleId(result.sale?.id ?? null);
        setTimeout(() => setSaleComplete(false), 8000);
        fetch("/api/customers")
          .then((r) => r.json())
          .then((data) => setCustomers(data.customers ?? []))
          .catch(() => {});
      } else if (result.error) {
        setSaleError(
          typeof result.error === "string" ? result.error : "Sale failed"
        );
      }
    });
  }

  return (
    <>
      <Header title="Point of Sale" subtitle="Tap products to add to cart" />
      <main className="p-4 md:p-6 max-w-7xl mobile-page">
        <div className="flex justify-end mb-3">
          <Link
            href="/sales/history"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-biz-blue hover:underline"
          >
            <History className="h-4 w-4" />
            Sales history
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Product search */}
          <div className="lg:col-span-3 space-y-4">
            <ScanProductButton onProductFound={addToCart} disabled={isPending} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search products or scan barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-14 text-base"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={product.quantity === 0}
                  className="rounded-xl border border-border/50 bg-white p-3 text-left hover:border-biz-blue hover:shadow-soft transition-all disabled:opacity-40 active:scale-[0.97] touch-manipulation min-h-[72px]"
                >
                  <p className="font-semibold text-sm truncate">{product.name}</p>
                  <p className="text-biz-blue font-bold mt-1">
                    {formatCurrency(product.sellingPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {product.quantity} left
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-2">
            <Card className="sticky top-20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-biz-blue" />
                  <h2 className="font-semibold">Cart ({cart.length})</h2>
                </div>

                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Tap products to add them here
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.sellingPrice)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQty(item.product.id, -1)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-white border"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.product.id, 1)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-white border"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateQty(item.product.id, -item.quantity)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-biz-blue">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        className={`rounded-xl py-3 text-sm font-semibold border transition-all ${
                          paymentMethod === method.value
                            ? "bg-biz-blue text-white border-biz-blue"
                            : "bg-white border-border hover:border-biz-blue/50"
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "CREDIT" && (
                    <CreditCustomerPicker
                      customers={customers}
                      selectedId={customerId}
                      onSelect={setCustomerId}
                      onCustomerCreated={(customer) =>
                        setCustomers((prev) =>
                          [...prev, customer].sort((a, b) =>
                            a.name.localeCompare(b.name)
                          )
                        )
                      }
                    />
                  )}

                  {saleError && (
                    <p className="text-sm text-red-500 text-center">{saleError}</p>
                  )}

                  {saleComplete && lastSaleId && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 space-y-2">
                      <p className="text-sm font-medium text-emerald-800 text-center">
                        Sale complete
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/sales/${lastSaleId}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-sm font-medium py-2 hover:bg-emerald-100 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          Receipt
                        </Link>
                        <Link
                          href={`/sales/${lastSaleId}?print=1`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 text-white text-sm font-medium py-2 hover:bg-emerald-800 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </Link>
                      </div>
                    </div>
                  )}

                  <Button
                    size="lg"
                    variant="success"
                    className="w-full h-14 text-base"
                    onClick={completeSale}
                    disabled={cart.length === 0 || isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : saleComplete ? (
                      <>
                        <Check className="h-5 w-5" />
                        Sale Complete!
                      </>
                    ) : (
                      `Complete Sale — ${formatCurrency(subtotal)}`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
