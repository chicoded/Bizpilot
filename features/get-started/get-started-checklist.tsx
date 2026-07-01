import Link from "next/link";
import { CheckCircle2, Circle, Package, ShoppingCart, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { GetStartedProgress } from "@/lib/get-started-progress";
import { cn } from "@/lib/utils";

const steps = [
  {
    key: "hasProduct" as const,
    title: "Add your first product",
    description: "Set up inventory so you can sell from POS.",
    href: "/inventory/new",
    icon: Package,
  },
  {
    key: "hasSale" as const,
    title: "Record your first sale",
    description: "Try the point of sale and print a receipt.",
    href: "/sales",
    icon: ShoppingCart,
  },
  {
    key: "hasTeamMember" as const,
    title: "Invite a team member",
    description: "Add staff with the right page access.",
    href: "/settings/team",
    icon: Users,
  },
];

export function GetStartedChecklist({
  progress,
}: {
  progress: GetStartedProgress;
}) {
  const percent = Math.round(
    (progress.completedCount / progress.totalSteps) * 100
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Setup progress
              </p>
              <p className="text-2xl font-bold">
                {progress.completedCount} of {progress.totalSteps} complete
              </p>
            </div>
            {progress.isComplete && (
              <Button asChild variant="success">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            )}
          </div>
          <Progress value={percent} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const done = progress[step.key];
          const Icon = step.icon;
          return (
            <Card
              key={step.key}
              className={cn(done && "border-success/30 bg-success/5")}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-biz-blue/10">
                  <Icon className="h-5 w-5 text-biz-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Step {index + 1}
                  </p>
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                  {!done && (
                    <Button asChild size="sm" className="mt-3">
                      <Link href={step.href}>Start</Link>
                    </Button>
                  )}
                </div>
                {done ? (
                  <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground shrink-0" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
