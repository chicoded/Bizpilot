"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createSale } from "@/actions/business";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/types";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/components/monitoring/monitoring-provider";
import {
  CreditCustomerPicker,
  type CustomerOption,
} from "@/features/sales/credit-customer-picker";
import {
  ScanProductButton,
  type ScannableProduct,
  lookupProductByBarcode,
} from "@/features/sales/scan-product-button";
import { ExternalScannerStatus } from "@/features/sales/external-scanner-status";
import { useBarcodeScannerWedge } from "@/hooks/use-barcode-scanner-wedge";
import { looksLikeBarcode } from "@/lib/barcode-product-lookup";
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
  RefreshCw,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function ProductSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px]" />
      ))}
    </div>
  );
}

export default function SalesPage() {
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [totalInStock, setTotalInStock] = useState(0);
  const [productViewMode, setProductViewMode] = useState<"quick" | "search">(
    "quick"
  );
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [saleError, setSaleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastReceiptNumber, setLastReceiptNumber] = useState<string | null>(null);
  const [barcodeLookupPending, startBarcodeLookup] = useTransition();
  const cartRef = useRef<HTMLDivElement>(null);

  const loadQuickPicks = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setProductsLoading(true);
    }
    setProductsError(null);
    try {
      const response = await fetch("/api/products?pos=1");
      if (!response.ok) throw new Error("Failed to load products");
      const data = await response.json();
      setDisplayProducts(data.products ?? []);
      setTotalInStock(data.totalInStock ?? data.products?.length ?? 0);
      setProductViewMode("quick");
    } catch {
      setProductsError(
        "Could not load products. Check your connection and try again."
      );
    } finally {
      if (!options?.silent) {
        setProductsLoading(false);
      }
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await fetch("/api/customers");
      if (!response.ok) return;
      const data = await response.json();
      setCustomers(data.customers ?? []);
    } catch {
      // Non-blocking for POS
    }
  }, []);

  useEffect(() => {
    loadQuickPicks();
    loadCustomers();
  }, [loadQuickPicks, loadCustomers]);

  useEffect(() => {
    const term = search.trim();
    if (!term) {
      void loadQuickPicks({ silent: true });
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/products?q=${encodeURIComponent(term)}`
        );
        if (!response.ok) throw new Error("Search failed");
        const data = await response.json();
        setDisplayProducts(data.products ?? []);
        setProductViewMode("search");
        setProductsError(null);
      } catch {
        setProductsError("Could not search products. Try again.");
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [search, loadQuickPicks]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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

  const handleBarcodeScan = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || !looksLikeBarcode(code)) return;

      startBarcodeLookup(async () => {
        const result = await lookupProductByBarcode(code);
        if (result.ok) {
          addToCart(result.product);
          setSearch("");
          toast({
            title: "Added to cart",
            description: result.product.name,
            variant: "success",
          });
          return;
        }
        if (result.reason === "not_found") {
          toast({
            title: "Product not found",
            description: `No product matches barcode ${code}.`,
            variant: "destructive",
            action: {
              label: "Add product",
              onClick: () => {
                window.location.href = `/inventory/new?barcode=${encodeURIComponent(code)}`;
              },
            },
          });
          return;
        }
        toast({
          title: "Scan failed",
          description: result.message,
          variant: "destructive",
        });
      });
    },
    [startBarcodeLookup]
  );

  useBarcodeScannerWedge({
    enabled: !isPending && !barcodeLookupPending,
    onScan: handleBarcodeScan,
  });

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

  function scrollToCart() {
    cartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        const saleId = result.sale?.id ?? null;
        const receiptNumber = result.sale?.receiptNumber ?? null;
        setLastSaleId(saleId);
        setLastReceiptNumber(receiptNumber);
        trackEvent("sale_completed", {
          item_count: cartItemCount,
          total: subtotal,
          payment_method: paymentMethod,
        });
        toast({
          title: "Sale complete",
          description: receiptNumber
            ? `${receiptNumber} · ${formatCurrency(subtotal)} recorded.`
            : `${formatCurrency(subtotal)} recorded successfully.`,
          variant: "success",
          action: saleId
            ? {
                label: "View receipt",
                onClick: () => {
                  window.location.href = `/sales/${saleId}`;
                },
              }
            : undefined,
        });
        setTimeout(() => setSaleComplete(false), 8000);
        loadQuickPicks({ silent: true });
        loadCustomers();
      } else if (result.error) {
        const message =
          typeof result.error === "string" ? result.error : "Sale failed";
        setSaleError(message);
        toast({
          title: "Sale failed",
          description: message,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <>
      <AppShell
        title="Point of Sale"
        subtitle="Tap products to add to cart"
        className={cn(cart.length > 0 && "pb-36 lg:pb-6")}
        actions={
          <Link
            href="/sales/history"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-1"
          >
            <History className="h-4 w-4" aria-hidden />
            Sales history
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <ScanProductButton onProductFound={addToCart} disabled={isPending} />
            <ExternalScannerStatus />
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Search products or scan barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && looksLikeBarcode(search)) {
                    e.preventDefault();
                    handleBarcodeScan(search);
                  }
                }}
                data-barcode-wedge="true"
                className="pl-10 h-14 text-base"
                autoFocus
                aria-label="Search products or scan barcode"
                disabled={barcodeLookupPending}
              />
              {(barcodeLookupPending || searchLoading) && (
                <Loader2
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground"
                  aria-hidden
                />
              )}
            </div>

            {!productsLoading && !productsError && displayProducts.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {productViewMode === "quick" ? "Frequently sold" : "Search results"}
                </p>
                <p className="text-xs text-muted-foreground text-right">
                  {productViewMode === "quick" && totalInStock > displayProducts.length
                    ? `${displayProducts.length} of ${totalInStock} · search for more`
                    : productViewMode === "search"
                      ? `${displayProducts.length} match${displayProducts.length === 1 ? "" : "es"}`
                      : null}
                </p>
              </div>
            )}

            {productsLoading ? (
              <ProductSkeletonGrid />
            ) : productsError ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3"
              >
                <p className="text-sm text-destructive font-medium">{productsError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadQuickPicks()}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Retry
                </Button>
              </div>
            ) : totalInStock === 0 && productViewMode === "quick" ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3">
                <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="font-medium">No products yet</p>
                <p className="text-sm text-muted-foreground">
                  Add products to inventory before recording sales.
                </p>
                <Button asChild variant="outline">
                  <Link href="/inventory/new">Add product</Link>
                </Button>
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-2">
                <p className="font-medium">No products match &ldquo;{search}&rdquo;</p>
                <p className="text-sm text-muted-foreground">
                  Try a different search or scan a barcode.
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2",
                  productViewMode === "search" && "max-h-[50vh] overflow-y-auto"
                )}
              >
                {displayProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={product.quantity === 0}
                    className="rounded-xl border border-border bg-card p-3 text-left hover:border-primary hover:shadow-soft transition-all disabled:opacity-40 active:scale-[0.97] touch-manipulation min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="font-semibold text-sm truncate text-foreground">{product.name}</p>
                    <p className="text-brand font-bold mt-1">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {product.quantity} left
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2" ref={cartRef}>
            <Card className="lg:sticky lg:top-20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-brand" aria-hidden />
                  <h2 className="font-semibold text-foreground">Cart ({cartItemCount})</h2>
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
                        className="flex items-center gap-2 rounded-lg surface-muted p-2"
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
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => updateQty(item.product.id, -1)}
                            aria-label={`Decrease quantity of ${item.product.name}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span
                            className="w-6 text-center text-sm font-bold"
                            aria-label={`Quantity: ${item.quantity}`}
                          >
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => updateQty(item.product.id, 1)}
                            aria-label={`Increase quantity of ${item.product.name}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => updateQty(item.product.id, -item.quantity)}
                            aria-label={`Remove ${item.product.name} from cart`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-brand">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-2"
                    role="group"
                    aria-label="Payment method"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentMethod(method.value)}
                        aria-pressed={paymentMethod === method.value}
                        className={cn(
                          "rounded-xl py-3 text-sm font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          paymentMethod === method.value
                            ? "bg-biz-blue text-white border-biz-blue dark:bg-primary dark:text-primary-foreground dark:border-primary"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
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
                    <p role="alert" className="text-sm text-destructive text-center">
                      {saleError}
                    </p>
                  )}

                  {saleComplete && lastSaleId && (
                    <div className="rounded-lg bg-success/10 border border-success/20 p-3 space-y-2">
                      <p className="text-sm font-medium text-success text-center">
                        Sale complete
                      </p>
                      {lastReceiptNumber && (
                        <p className="text-center font-mono text-xs text-muted-foreground">
                          {lastReceiptNumber}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/sales/${lastSaleId}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-card border border-success/30 text-success text-sm font-medium py-2 hover:bg-success/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                          Receipt
                        </Link>
                        <Link
                          href={`/sales/${lastSaleId}?print=1`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-success text-success-foreground text-sm font-medium py-2 hover:bg-success/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Printer className="h-4 w-4" aria-hidden />
                          Print
                        </Link>
                      </div>
                    </div>
                  )}

                  <Button
                    size="lg"
                    variant="success"
                    className="w-full h-14 text-base hidden lg:flex"
                    onClick={completeSale}
                    disabled={cart.length === 0 || isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-label="Processing sale" />
                    ) : saleComplete ? (
                      <>
                        <Check className="h-5 w-5" aria-hidden />
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
      </AppShell>

      {cart.length > 0 && (
        <div className="fixed bottom-[4.5rem] left-0 right-0 z-[90] md:hidden border-t border-border bg-card/95 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
              </p>
              <p className="text-lg font-bold text-brand">
                {formatCurrency(subtotal)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={scrollToCart}
            >
              Review
            </Button>
            <Button
              type="button"
              variant="success"
              size="sm"
              className="min-w-[88px]"
              onClick={completeSale}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-label="Processing sale" />
              ) : (
                "Pay"
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
