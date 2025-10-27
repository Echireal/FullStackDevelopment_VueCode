export const API_BASE = import.meta.env.VITE_API_BASE // 由 Actions 注入或手动写死

export async function getHealth() {
  const r = await fetch(`${API_BASE}/api/health`, { credentials: 'omit' })
  if (!r.ok) throw new Error('health failed')
  return r.json()
}

export async function getProducts() {
  const r = await fetch(`${API_BASE}/api/products`, { credentials: 'omit' })
  if (!r.ok) throw new Error('products failed')
  return r.json()
}