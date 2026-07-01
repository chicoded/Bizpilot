import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCTION_ENV_CHECKLIST } from "@/lib/env";

export interface EnvStatusItem {
  key: string;
  service: string;
  required: boolean;
  configured: boolean;
}

export function getEnvStatus(): EnvStatusItem[] {
  return PRODUCTION_ENV_CHECKLIST.map((item) => ({
    key: item.key,
    service: item.service,
    required: item.required,
    configured: Boolean(process.env[item.key]),
  }));
}

export function EnvStatusPanel({ items }: { items: EnvStatusItem[] }) {
  const requiredMissing = items.filter((i) => i.required && !i.configured);
  const optionalMissing = items.filter((i) => !i.required && !i.configured);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Environment status</CardTitle>
        <p className="text-sm text-muted-foreground">
          Server-side check — shows whether vars are set, not their values.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {requiredMissing.length > 0 && (
          <p className="text-sm text-destructive font-medium">
            {requiredMissing.length} required variable
            {requiredMissing.length > 1 ? "s" : ""} missing on this deployment.
          </p>
        )}

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 text-sm rounded-lg border border-border px-3 py-2"
            >
              {item.configured ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : item.required ? (
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs">{item.key}</p>
                <p className="text-xs text-muted-foreground">{item.service}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {item.required ? "Required" : "Optional"}
              </span>
            </li>
          ))}
        </ul>

        {optionalMissing.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {optionalMissing.length} optional integration
            {optionalMissing.length > 1 ? "s" : ""} not configured — fine for
            beta if you don&apos;t need them yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
