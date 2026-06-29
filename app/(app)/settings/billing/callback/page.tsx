import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyCheckout } from "@/actions/billing";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface CallbackPageProps {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}

export default async function BillingCallbackPage({
  searchParams,
}: CallbackPageProps) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref;

  if (!reference) {
    redirect("/settings/billing");
  }

  const result = await verifyCheckout(reference);

  return (
    <>
      <Header title="Payment" />
      <main className="p-4 md:p-6 max-w-md mx-auto">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            {result.success ? (
              <>
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
                <h2 className="text-xl font-bold text-emerald-700">
                  Payment Successful!
                </h2>
                <p className="text-sm text-muted-foreground">
                  {result.alreadyProcessed
                    ? "This payment was already processed."
                    : `Your ${result.subscription?.plan ?? ""} plan is now active for 30 days.`}
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold text-red-600">
                  Payment Failed
                </h2>
                <p className="text-sm text-muted-foreground">
                  {result.error ?? "We could not verify your payment. Please try again."}
                </p>
              </>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/dashboard">
                <Button className="w-full" variant={result.success ? "success" : "default"}>
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/settings/billing">
                <Button variant="outline" className="w-full">
                  Back to Billing
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
