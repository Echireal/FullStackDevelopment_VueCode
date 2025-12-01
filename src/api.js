const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
export const API_BASE = BASE;

export async function fetchLessons() {
  const res = await fetch(`${BASE}/api/lessons`);
  if (!res.ok) throw new Error(`GET /api/lessons failed: ${res.status}`);
  return res.json();
}

export async function postOrder(orderBody) {
  const res = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderBody),
  });
  if (!res.ok) throw new Error(`POST /api/orders failed: ${res.status}`);
  return res.json();
}

export async function putLesson(id, updates) {
  const res = await fetch(`${BASE}/api/lessons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`PUT /api/lessons/:id failed: ${res.status}`);
  return res.json();
}

export async function searchLessons(q) {
  const url = `${BASE}/api/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET /api/search failed: ${res.status}`);
  return res.json();
}