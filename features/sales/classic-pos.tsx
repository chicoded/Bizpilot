"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalData } from "@/components/providers/local-data-provider";
import { listLocalProducts, searchLocalProducts } from "@/lib/local-data/products";
import { listPosSellableProducts } from "@/lib/hybrid-inventory";

import { listLocalCustomers } from "@/lib/local-data/customers";
import { createLocalSale } from "@/lib/local-data/sales";
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
import { useBarcodeScannerWedge } from "@/hooks/use-barcode-scanner-wedge";
import { looksLikeBarcode } from "@/lib/barcode-product-lookup";
import { subscribeLocalDataChanged } from "@/lib/sync/events";
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Check,
  Loader2,
  History,
  FileText,
  Printer,
  RefreshCw,
  PackageOpen,
  X,
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

export function ClassicPos() {
  const { businessId, status } = useLocalData();
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadQuickPicks = useCallback(async (options?: { silent?: boolean }) => {
    if (!businessId) {
      setProductsError("Local shop data is still loading…");
      setProductsLoading(false);
      return;
    }

    if (!options?.silent) {
      setProductsLoading(true);
    }
    setProductsError(null);
    try {
      const products = await listLocalProducts(businessId);
      const sellable = listPosSellableProducts(products);
      const quick = sellable
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sellingPrice: p.sellingPrice,
          quantity: p.quantity,
          barcode: p.barcode,
        }));
      setDisplayProducts(quick);
      setTotalInStock(sellable.length);
      setProductViewMode("quick");
    } catch {
      setProductsError("Could not load local products.");
    } finally {
      if (!options?.silent) {
        setProductsLoading(false);
      }
    }
  }, [businessId]);

  const loadCustomers = useCallback(async () => {
    if (!businessId) return;
    try {
      const rows = await listLocalCustomers(businessId);
      setCustomers(
        rows.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          debt: c.debt,
        }))
      );
    } catch {
      // Non-blocking for POS
    }
  }, [businessId]);

  useEffect(() => {
    if (status !== "ready" || !businessId) return;
    loadQuickPicks();
    loadCustomers();
  }, [loadQuickPicks, loadCustomers, status, businessId]);

  useEffect(() => {
    return subscribeLocalDataChanged((detail) => {
      if (detail.type === "products" || detail.type === "all") {
        void loadQuickPicks({ silent: true });
      }
    });
  }, [loadQuickPicks]);

  useEffect(() => {
    const term = search.trim();
    if (!businessId) return;

    if (!term) {
      void loadQuickPicks({ silent: true });
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const products = await searchLocalProducts(businessId, term);
        setDisplayProducts(
          listPosSellableProducts(products).map((p) => ({
              id: p.id,
              name: p.name,
              sellingPrice: p.sellingPrice,
              quantity: p.quantity,
              barcode: p.barcode,
            }))
        );
        setProductViewMode("search");
        setProductsError(null);
      } catch {
        setProductsError("Could not search local products.");
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [search, loadQuickPicks, businessId]);

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
    // Keep the Pay bar visible — keyboard/search focus often covers it after scan.
    requestAnimationFrame(() => {
      searchInputRef.current?.blur();
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

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function clearCart() {
    setCart([]);
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
      if (!businessId) {
        setSaleError("Local shop data is not ready yet.");
        return;
      }

      const result = await createLocalSale(businessId, {
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        paymentMethod,
        customerId: paymentMethod === "CREDIT" ? customerId : undefined,
        isCredit: paymentMethod === "CREDIT",
      });

      if ("sale" in result) {
        setCart([]);
        setCustomerId("");
        setSaleComplete(true);
        const saleId = result.sale.id;
        const receiptNumber = result.sale.receiptNumber;
        setLastSaleId(saleId);
        setLastReceiptNumber(receiptNumber);
        trackEvent("sale_completed", {
          item_count: cartItemCount,
          total: subtotal,
          payment_method: paymentMethod,
        });
        toast({
          title: "Sale complete",
          description: `${receiptNumber} · ${formatCurrency(subtotal)} saved on this device.`,
          variant: "success",
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
        className={cn("!p-3 md:!p-4", cart.length > 0 && "pb-56 lg:pb-6")}
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
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            <ScanProductButton onProductFound={addToCart} disabled={isPending} />
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={searchInputRef}
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
                enterKeyHint="done"
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
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-brand" aria-hidden />
                  <h2 className="font-semibold text-foreground">Cart ({cartItemCount})</h2>
                </div>

                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Tap products to add them here
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-2 rounded-lg surface-muted p-2"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label={`Remove ${item.product.name} from cart`}
                        >
                          <X className="h-5 w-5" strokeWidth={2.5} />
                        </Button>
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
                            className="h-9 w-9 touch-manipulation"
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
                            className="h-9 w-9 touch-manipulation"
                            onClick={() => updateQty(item.product.id, 1)}
                            aria-label={`Increase quantity of ${item.product.name}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={clearCart}
                      className="w-full text-center text-xs font-medium text-destructive py-1 touch-manipulation"
                    >
                      Clear cart
                    </button>
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
        <div
          className="fixed inset-x-0 z-[110] md:hidden border-t border-border bg-card/95 backdrop-blur-xl px-3 pt-2 pb-3 shadow-[0_-8px_28px_rgba(0,0,0,0.18)] dark:shadow-[0_-8px_28px_rgba(0,0,0,0.45)] pointer-events-auto"
          style={{
            // Sit above bottom nav + raised center button so Pay stays usable after scan
            bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="max-w-7xl mx-auto space-y-2">
            <div className="max-h-28 overflow-y-auto space-y-1.5">
              {[...cart].reverse().map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 rounded-xl bg-muted/70 px-2 py-1.5"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
                    onClick={() => removeFromCart(item.product.id)}
                    aria-label={`Remove ${item.product.name}`}
                  >
                    <X className="h-4 w-4" strokeWidth={2.75} />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ×{item.quantity} ·{" "}
                      {formatCurrency(item.product.sellingPrice * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 touch-manipulation"
                      onClick={() => updateQty(item.product.id, -1)}
                      aria-label={`Decrease ${item.product.name}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 touch-manipulation"
                      onClick={() => updateQty(item.product.id, 1)}
                      aria-label={`Increase ${item.product.name}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={scrollToCart}
                className="flex-1 min-w-0 text-left touch-manipulation rounded-xl px-1"
              >
                <p className="text-xs text-muted-foreground">
                  {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                </p>
                <p className="text-lg font-bold text-brand leading-tight">
                  {formatCurrency(subtotal)}
                </p>
              </button>
              <Button
                type="button"
                variant="success"
                size="lg"
                className="h-12 min-w-[120px] shrink-0 touch-manipulation text-base font-semibold"
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
        </div>
      )}
    </>
  );
}
