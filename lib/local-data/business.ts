import { getLocalDB } from "@/lib/local-db/database";
import type { LocalBusinessMeta } from "@/lib/local-db/types";

export async function setLocalBusinessMeta(meta: LocalBusinessMeta): Promise<void> {
  await getLocalDB().businessMeta.put(meta);
}

export async function getLocalBusinessMeta(): Promise<LocalBusinessMeta | undefined> {
  const all = await getLocalDB().businessMeta.toArray();
  return all[0];
}

export async function getActiveBusinessId(): Promise<string | null> {
  const meta = await getLocalBusinessMeta();
  return meta?.businessId ?? null;
}
