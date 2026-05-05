import type { ClientFile } from "./types";

export interface StorageProvider {
  readonly name: "mock" | "supabase";
  getFiles(clientId?: string): Promise<ClientFile[]>;
  getFile(id: string): Promise<ClientFile | null>;
  saveFile(file: ClientFile): Promise<ClientFile>;
  deleteFile(id: string): Promise<void>;
  updateFileStatus(id: string, status: ClientFile["status"]): Promise<void>;
}

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider;

  const hasSupabase =
    typeof process !== "undefined" &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabase) {
    // Placeholder — Supabase Storage integration is documented in /docs/storage-setup.md
    // Falls through to mock until the real provider is implemented
    const { MockStorageProvider } = require("./mock-storage-provider");
    _provider = new MockStorageProvider();
  } else {
    const { MockStorageProvider } = require("./mock-storage-provider");
    _provider = new MockStorageProvider();
  }

  return _provider!;
}

export function resetStorageProvider(): void {
  _provider = null;
}
