import type { ClientFile } from "./types";

export interface StorageProvider {
  readonly name: "mock" | "supabase";
  getFiles(clientId?: string): Promise<ClientFile[]>;
  getFile(id: string): Promise<ClientFile | null>;
  saveFile(file: ClientFile & { _blob?: File }): Promise<ClientFile>;
  deleteFile(id: string): Promise<void>;
  updateFileStatus(id: string, status: ClientFile["status"]): Promise<void>;
}

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider;

  const hasSupabase =
    typeof process !== "undefined" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "placeholder-anon-key";

  if (hasSupabase) {
    const { SupabaseStorageProvider } = require("./supabase-storage-provider");
    _provider = new SupabaseStorageProvider();
  } else {
    const { MockStorageProvider } = require("./mock-storage-provider");
    _provider = new MockStorageProvider();
  }

  return _provider!;
}

export function resetStorageProvider(): void {
  _provider = null;
}
