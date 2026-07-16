import { ScanBarcode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HardwareTipsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScanBarcode className="h-5 w-5" />
          Barcode scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">
        <p>
          USB and Bluetooth scanners that type like a keyboard work on the sales
          page automatically — no extra setup.
        </p>
        <p>
          Plug in the scanner, open <strong className="text-foreground">Sales</strong>,
          and scan into the search box (or anywhere on that page). On phones, use
          the camera scan button instead.
        </p>
      </CardContent>
    </Card>
  );
}
