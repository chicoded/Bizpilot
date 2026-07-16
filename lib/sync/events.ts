/** Browser event so POS / inventory reload after team product sync. */
export const LOCAL_DATA_CHANGED_EVENT = "bizpilot:local-data-changed";

export type LocalDataChangedDetail = {
  type: "products" | "sales" | "customers" | "all";
};

export function notifyLocalDataChanged(
  type: LocalDataChangedDetail["type"] = "products"
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LocalDataChangedDetail>(LOCAL_DATA_CHANGED_EVENT, {
      detail: { type },
    })
  );
}

export function subscribeLocalDataChanged(
  handler: (detail: LocalDataChangedDetail) => void
) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<LocalDataChangedDetail>).detail;
    handler(detail ?? { type: "all" });
  };
  window.addEventListener(LOCAL_DATA_CHANGED_EVENT, listener);
  return () => window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, listener);
}
