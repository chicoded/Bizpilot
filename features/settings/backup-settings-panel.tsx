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
import { deliverBackupToDrive } from "@/lib/backup/drive";
import { downloadBackupFile, exportBackupJson } from "@/lib/backup/export";
import { useLocalData } from "@/components/providers/local-data-provider";
import {
  CloudUpload,
  Download,
  FolderOpen,
  HardDrive,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      setMessage("Google connected — Gmail and Drive backups are ready.");
    }
  }, [searchParams]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "bizpilot:gmail-connected") {
        setConfig(getBackupConfig());
        setGmailInput(getBackupConfig().gmailEmail ?? "");
        setMessage("Google connected — Gmail and Drive backups are ready.");
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
      setConfig(getBackupConfig());
      setMessage(result.message);
    });
  }

  function handleSaveToDrive() {
    if (!businessId) {
      setMessage("No local shop data found yet.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const json = await exportBackupJson(businessId);
      const result = await deliverBackupToDrive(json, businessName);
      setConfig(getBackupConfig());
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

  function handleConnectGoogle() {
    setMessage(null);
    startTransition(async () => {
      const result = await connectGmailAccount();
      setConfig(getBackupConfig());
      if (result.ok) {
        setGmailInput(result.email);
        setMessage(
          `Connected ${result.email} — backups can save to Gmail and Google Drive.`
        );
      } else {
        setMessage(result.error);
      }
    });
  }

  const hasGoogle = Boolean(config.gmailAccessToken && config.gmailEmail);
  const backupToGmail = config.backupToGmail !== false;
  const backupToDrive = config.backupToDrive === true;

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
            device first. Backups keep a copy in Gmail and/or Google Drive so you
            don&apos;t lose shop data.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5" />
            Save to Gmail or Drive
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
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateConfig({ backupToGmail: !backupToGmail })}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors touch-manipulation",
                backupToGmail
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <p className="font-medium text-sm flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Gmail
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {backupToGmail ? "On — email backup file" : "Off"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => updateConfig({ backupToDrive: !backupToDrive })}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors touch-manipulation",
                backupToDrive
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <p className="font-medium text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Google Drive
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {backupToDrive
                  ? "On — save to BizPilot Backups folder"
                  : "Off"}
              </p>
            </button>
          </div>

          <div className="flex flex-col gap-2">
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
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full h-12 touch-manipulation"
              onClick={handleSaveToDrive}
              disabled={isPending || !businessId}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4" />
              )}
              Save backup to Drive now
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Without Google Connect, mobile share lets you pick Gmail or Drive.
            With Connect, files send/upload automatically.
          </p>

          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">Connect Google</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasGoogle
                    ? `Connected as ${config.gmailEmail} — Gmail send + Drive upload`
                    : "Allow BizPilot to email and save backups to your Google account"}
                </p>
              </div>
              {hasGoogle ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    disconnectGmailAccount();
                    setConfig(getBackupConfig());
                    setMessage("Google account disconnected.");
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConnectGoogle}
                  disabled={isPending}
                >
                  Connect Google
                </Button>
              )}
            </div>
            {!isGmailBackupConfigured() && (
              <p className="text-xs text-muted-foreground">
                Share to Gmail/Drive works without setup. For automatic save, add{" "}
                <span className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</span>{" "}
                in Vercel (Google Cloud OAuth with Gmail send + Drive file
                scopes).
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
                {backupToGmail || backupToDrive
                  ? ` → ${[
                      backupToGmail ? "Gmail" : null,
                      backupToDrive ? "Drive" : null,
                    ]
                      .filter(Boolean)
                      .join(" + ")}`
                  : ""}
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
              Run backup now
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
