import { Asset } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function fetchJSON<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}

export const assetService = {
  async list(): Promise<Asset[]> {
    if (!API_BASE) return [];
    return await fetchJSON<Asset[]>(`${API_BASE}/api/assets`);
  },

  async create(asset: Asset): Promise<Asset> {
    if (!API_BASE) return asset;
    return await fetchJSON<Asset>(`${API_BASE}/api/assets`, {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  },

  async update(id: string, updates: Partial<Asset>): Promise<Asset> {
    if (!API_BASE) return { ...(updates as Asset), id } as Asset;
    return await fetchJSON<Asset>(`${API_BASE}/api/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async remove(id: string): Promise<void> {
    if (!API_BASE) return;
    await fetchJSON<void>(`${API_BASE}/api/assets/${id}`, { method: 'DELETE' });
  },
};

export default assetService;
