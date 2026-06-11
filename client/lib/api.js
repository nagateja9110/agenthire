const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  let payload;

  const token = typeof window !== 'undefined' ? localStorage.getItem('agenthire_token') : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401 && token && typeof window !== 'undefined') {
    localStorage.removeItem('agenthire_token');
  }
  if (!res.ok || json.success === false) {
    const err = new Error(json?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = json?.error?.details;
    throw err;
  }
  return json.data;
}

export { API_URL };
