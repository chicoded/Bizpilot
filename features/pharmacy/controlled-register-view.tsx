import { AlertTriangle, ShieldCheck, PackageOpen } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import type {
  ControlledRegister,
  RegisterEntry,
} from "@/lib/pharmacy/controlled-register";

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE: "Received",
  SALE: "Dispensed",
  DAMAGE: "Damaged",
  THEFT: "Missing",
  EXPIRED: "Expired",
  RETURN: "Returned",
  MANUAL: "Adjusted",
};

export function ControlledRegisterView({
  register,
}: {
  register: ControlledRegister;
}) {
  if (!register.available) {
    return (
      <div
        role="status"
        className="rounded-xl border border-warning/40 bg-warning/5 p-6"
      >
        <p className="font-medium text-foreground">Register unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">{register.reason}</p>
      </div>
    );
  }

  if (register.entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <PackageOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="mt-3 font-medium text-foreground">
          No controlled stock yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Mark a drug&rsquo;s schedule as Controlled on its product page and every
          movement of it will be recorded here.
        </p>
      </div>
    );
  }

  const flagged = register.entries.filter((entry) => entry.unexplained !== 0);

  return (
    <div className="space-y-4">
      {flagged.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
            aria-hidden
          />
          <div>
            <p className="font-medium text-foreground">
              {flagged.length} drug{flagged.length === 1 ? "" : "s"} do not
              reconcile
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Stock on hand does not match the movements recorded. For
              controlled stock that gap needs an explanation, not a correction.
            </p>
          </div>
        </div>
      )}

      {register.entries.map((entry) => (
        <RegisterCard key={entry.productId} entry={entry} />
      ))}
    </div>
  );
}

function RegisterCard({ entry }: { entry: RegisterEntry }) {
  const reconciles = entry.unexplained === 0;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground">{entry.name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entry.nafdacNumber
              ? `NAFDAC ${entry.nafdacNumber}`
              : "No NAFDAC number recorded"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">On hand</p>
            <p className="tnum text-xl font-bold text-foreground">
              {entry.onHand}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
              reconciles
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {reconciles ? (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            )}
            {reconciles
              ? "Reconciles"
              : `${entry.unexplained > 0 ? "+" : ""}${entry.unexplained} unexplained`}
          </span>
        </div>
      </header>

      {entry.movements.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No movements recorded for this drug yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Movement history for {entry.name}, newest first
            </caption>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Movement</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Qty
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {entry.movements.map((movement) => (
                <tr key={movement.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {formatDate(movement.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-foreground">
                      {MOVEMENT_LABEL[movement.type] ?? movement.type}
                    </span>
                    {movement.reason && (
                      <span className="block text-xs text-muted-foreground">
                        {movement.reason}
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums",
                      movement.quantity < 0 ? "text-destructive" : "text-success"
                    )}
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">
                    {movement.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
