"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
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
  deliverBackupToGmail,
  disconnectGmailAccount,
  handleGmailOAuthRedirect,
  isGmailBackupConfigured,
  saveGmailAddress,
} from "@/lib/backup/gmail";
import { downloadBackupFile, exportBackupJson } from "@/lib/backup/export";
import { useLocalData } from "@/components/providers/local-data-provider";
import { CloudUpload, Download, HardDrive, Loader2, Mail, Send } from "lucide-react";

export function BackupSettingsPanel() {
  const { businessId, businessName, runBackupNow } = useLocalData();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [config, setConfig] = useState(getBackupConfig());
  const [gmailInput, setGmailInput] = useState(config.gmailEmail ?? "");

  useEffect(() => {
    handleGmailOAuthRedirect();
    setConfig(getBackupConfig());
    setGmailInput(getBackupConfig().gmailEmail ?? "");
  }, []);

  useEffect(() => {
    if (searchParams.get("gmail") === "connected") {
      setConfig(getBackupConfig());
      setGmailInput(getBackupConfig().gmailEmail ?? "");
      setMessage("Gmail connected — automatic email backups are ready.");
    }
  }, [searchParams]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "bizpilot:gmail-connected") {
        setConfig(getBackupConfig());
        setGmailInput(getBackupConfig().gmailEmail ?? "");
        setMessage("Gmail connected — automatic email backups are ready.");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function updateConfig(patch: Parameters<typeof saveBackupConfig>[0]) {
    const next = saveBackupConfig(patch);
    setConfig(next);
  }

  function handleSaveGmailAddress() {
    const result = saveGmailAddress(gmailInput);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setConfig(getBackupConfig());
    setMessage(`Gmail address saved: ${result.email}`);
  }

  function handleSendToGmail() {
    if (!businessId) {
      setMessage("No local shop data found yet.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const json = await exportBackupJson(businessId);
      const result = await deliverBackupToGmail(json, businessName);
      setMessage(result.message);
    });
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
      if (result.ok) {
        setGmailInput(result.email);
        setMessage(`Connected ${result.email} for automatic Gmail backups.`);
      } else {
        setMessage(result.error);
      }
    });
  }

  const hasAutoGmail = Boolean(config.gmailAccessToken && config.gmailEmail);

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5" />
            Gmail backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gmail-address">Your Gmail address</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="gmail-address"
                type="email"
                inputMode="email"
                placeholder="you@gmail.com"
                value={gmailInput}
                onChange={(e) => setGmailInput(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveGmailAddress}
                disabled={isPending}
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Backups are sent to this address on your schedule.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full h-12 touch-manipulation"
            onClick={handleSendToGmail}
            disabled={isPending || !businessId}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send backup to Gmail now
          </Button>
          <p className="text-xs text-muted-foreground -mt-2">
            On mobile, this opens the share menu — pick Gmail and send the file
            to yourself.
          </p>

          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">Automatic Gmail send</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasAutoGmail
                    ? `Connected — backups email automatically to ${config.gmailEmail}`
                    : "Connect Google to email backups without opening share each time"}
                </p>
              </div>
              {hasAutoGmail ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    disconnectGmailAccount();
                    setConfig(getBackupConfig());
                    setMessage("Automatic Gmail send disconnected.");
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConnectGmail}
                  disabled={isPending}
                >
                  Connect Google
                </Button>
              )}
            </div>
            {!isGmailBackupConfigured() && (
              <p className="text-xs text-muted-foreground">
                Share-to-Gmail works without setup. For fully automatic email,
                add <span className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</span>{" "}
                in Vercel (Google Cloud OAuth).
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudUpload className="h-5 w-5" />
            Backup schedule
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
              Run scheduled backup
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
