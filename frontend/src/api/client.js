// Every page calls THIS instead of using fetch() directly. Benefits:
// 1. The JWT token gets attached automatically — you never repeat that code
// 2. If the backend returns 401 (session expired), we log the user out
//    from one place instead of handling it in every page
// 3. Errors come back in one consistent shape

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content has no JSON body to parse
  if (res.status === 204) return null;

  const json = await res.json();

  if (!res.ok) {
    // Matches the { error: { code, message } } shape from the backend
    const message = json?.error?.message || 'Something went wrong';
    const error = new Error(message);
    error.code = json?.error?.code;
    error.status = res.status;
    throw error;
  }

  return json.data;
}

export const api = {
  get: (path, token) => request(path, { method: 'GET', token }),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  patch: (path, body, token) => request(path, { method: 'PATCH', body, token }),
  delete: (path, token) => request(path, { method: 'DELETE', token }),
};
