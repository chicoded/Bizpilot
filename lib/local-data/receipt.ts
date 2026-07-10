const RECEIPT_KEY = "bizpilot_local_receipt_seq";

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function nextLocalReceiptNumber(): string {
  const dateKey = todayKey();
  const storageKey = `${RECEIPT_KEY}_${dateKey}`;

  const current = Number(localStorage.getItem(storageKey) ?? "0") + 1;
  localStorage.setItem(storageKey, String(current));

  return `RCP-${dateKey}-${String(current).padStart(4, "0")}`;
}
