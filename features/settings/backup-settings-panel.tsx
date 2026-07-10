"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBackupConfig,
  saveBackupConfig,
  formatBackupFrequency,
} from "@/lib/local-db/backup-config";
import type { BackupFrequencyUnit } from "@/lib/local-db/types";
import {
  connectGmailAccount,
  disconnectGmailAccount,
  isGmailBackupConfigured,
} from "@/lib/backup/gmail";
import { downloadBackupFile, exportBackupJson } from "@/lib/backup/export";
import { useLocalData } from "@/components/providers/local-data-provider";
import { CloudUpload, Download, HardDrive, Loader2, Mail } from "lucide-react";

export function BackupSettingsPanel() {
  const { businessId, businessName, runBackupNow } = useLocalData();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [config, setConfig] = useState(getBackupConfig());

  useEffect(() => {
    setConfig(getBackupConfig());
  }, []);

  function updateConfig(patch: Parameters<typeof saveBackupConfig>[0]) {
    const next = saveBackupConfig(patch);
    setConfig(next);
  }

  function handleBackupNow() {
    setMessage(null);
    startTransition(async () => {
      const result = await runBackupNow();
      setConfig(getBackupConfig());
      setMessage(result.message);
    });
  }

  function handleDownload() {
    if (!businessId) {
      setMessage("No local shop data found yet.");
      return;
    }
    startTransition(async () => {
      const json = await exportBackupJson(businessId);
      downloadBackupFile(json, businessName);
      setMessage("Backup downloaded to your device.");
    });
  }

  function handleConnectGmail() {
    setMessage(null);
    startTransition(async () => {
      const result = await connectGmailAccount();
      setConfig(getBackupConfig());
      setMessage(result.ok ? `Connected ${result.email}` : result.error);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-5 w-5" />
            Local storage mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Your inventory, sales, customers, and expenses are saved on this
            device first. The app works like a traditional shop app even when
            the online database is down.
          </p>
          <p>
            Install BizPilot to your home screen for the best experience — it
            opens full screen without the browser bar.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudUpload className="h-5 w-5" />
            Gmail backup schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Automatic backups</p>
              <p className="text-xs text-muted-foreground">
                {formatBackupFrequency(
                  config.frequencyUnit,
                  config.frequencyInterval
                )}
              </p>
            </div>
            <Button
              type="button"
              variant={config.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => updateConfig({ enabled: !config.enabled })}
            >
              {config.enabled ? "On" : "Off"}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Every</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={config.frequencyInterval}
                onChange={(e) =>
                  updateConfig({
                    frequencyInterval: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={config.frequencyUnit}
                onValueChange={(value: BackupFrequencyUnit) =>
                  updateConfig({ frequencyUnit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Gmail account
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {config.gmailEmail
                    ? `Backups email to ${config.gmailEmail}`
                    : "Connect Gmail to email backups automatically"}
                </p>
              </div>
              {config.gmailEmail ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    disconnectGmailAccount();
                    setConfig(getBackupConfig());
                    setMessage("Gmail disconnected.");
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConnectGmail}
                  disabled={isPending || !isGmailBackupConfigured()}
                >
                  Connect Gmail
                </Button>
              )}
            </div>
            {!isGmailBackupConfigured() && (
              <p className="text-xs text-muted-foreground">
                Google sign-in is optional. You can still download backups or
                use Share to send the file to Gmail manually.
              </p>
            )}
          </div>

          {config.lastBackupAt && (
            <p className="text-xs text-muted-foreground">
              Last backup: {new Date(config.lastBackupAt).toLocaleString()}
              {config.lastBackupMessage ? ` — ${config.lastBackupMessage}` : ""}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              className="flex-1"
              onClick={handleBackupNow}
              disabled={isPending || !businessId}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4" />
              )}
              Backup now
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={isPending || !businessId}
            >
              <Download className="h-4 w-4" />
              Download backup
            </Button>
          </div>

          {message && (
            <p className="text-sm rounded-lg bg-muted px-3 py-2">{message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
