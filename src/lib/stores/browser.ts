// Veil Browser — global stores
import { writable } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';

export interface Tab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  blockedCount: number;
}

export const tabs = writable<Tab[]>([]);
export const activeTabId = writable<string | null>(null);

export interface BrowserStats {
  rules_loaded: number;
  requests_checked: number;
  requests_blocked: number;
}

export const stats = writable<BrowserStats>({
  rules_loaded: 0,
  requests_checked: 0,
  requests_blocked: 0
});

export async function refreshStats() {
  try {
    const s = await invoke<BrowserStats>('get_stats');
    stats.set(s);
  } catch (e) {
    console.error('Failed to get stats:', e);
  }
}

export async function parseQuery(input: string): Promise<string> {
  return await invoke<string>('parse_query', { input });
}

export async function checkRequest(
  url: string,
  source: string,
  requestType: string
): Promise<boolean> {
  const result = await invoke<{ blocked: boolean }>('check_request', {
    req: { url, source, request_type: requestType }
  });
  return result.blocked;
}

export async function getCosmeticFilters(url: string): Promise<string[]> {
  return await invoke<string[]>('get_cosmetic_filters', { url });
}

// Generate a unique tab ID
export function newTabId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
