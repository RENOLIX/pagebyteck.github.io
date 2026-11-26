export class ApiError extends Error {
  constructor(public status: number, public body: string) { super(`API ${status}: ${body}`) }
}

async function req<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  })
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => ''))
  if (res.status === 204) return null as T
  const ct = res.headers.get('content-type') || ''
  return (ct.includes('json') ? res.json() : res.text()) as Promise<T>
}

export interface Me { id: string; email: string; name: string; isAdmin: boolean; publicBaseUrl: string; brand: string }
export interface SiteSummary {
  id: string; username: string; title: string; status: 'draft' | 'published'
  publishedAt: string | null; updatedAt: string; ownerEmail?: string | null
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SiteFull extends SiteSummary { tokens: Record<string, any>; seo: Record<string, any> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SectionT { id: string; type: string; position: number; visible: boolean; data: any }
export interface Stats {
  views: { date: string; views: number }[]
  clicks: { item: string; clicks: number; label: string; kind: string }[]
}
export type Range = '7d' | '30d' | 'all'

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  me: () => req<Me>('/me'),
  uploadImage: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/media', { method: 'POST', credentials: 'include', body: fd })
    if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => ''))
    return res.json() as Promise<{ id: string; url: string; width: number; height: number }>
  },
  searchIcons: (q: string) => req<{ icons: { slug: string; title: string; hex: string }[] }>(`/icons/search?q=${encodeURIComponent(q)}`),
  listSites: () => req<{ sites: SiteSummary[] }>('/sites'),
  getSite: (id: string) => req<{ site: SiteFull; sections: SectionT[] }>(`/sites/${id}`),
  updateSite: (id: string, b: { title?: string; tokens?: unknown; seo?: unknown }) => req<{ site: SiteFull }>(`/sites/${id}`, json('PATCH', b)),
  publish: (id: string) => req<{ ok: boolean; url: string }>(`/sites/${id}/publish`, json('POST')),
  unpublish: (id: string) => req(`/sites/${id}/unpublish`, json('POST')),
  addSection: (id: string, type: string) => req<{ section: SectionT }>(`/sites/${id}/sections`, json('POST', { type })),
  updateSection: (id: string, b: { data?: unknown; visible?: boolean }) => req<{ section: SectionT }>(`/sections/${id}`, json('PATCH', b)),
  deleteSection: (id: string) => req(`/sections/${id}`, json('DELETE')),
  reorder: (id: string, order: string[]) => req(`/sites/${id}/reorder`, json('POST', { order })),
  stats: (id: string, range: Range) => req<Stats>(`/sites/${id}/stats?range=${range}`),
  previewUrl: (id: string, nonce: number) => `/api/sites/${id}/preview?v=${nonce}`,
}
