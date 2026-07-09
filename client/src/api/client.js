import axios from 'axios';

// withCredentials is required on every instance that talks to the API now —
// it's what makes the browser send/receive the httpOnly refresh-token cookie
// and the csrfToken cookie cross-origin.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true });

// Separate, interceptor-free instance for the refresh call itself — if it
// used `api`, a failed refresh would recursively trigger the same 401
// handler that's trying to refresh in the first place.
const rawAxios = axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true });

// Access token lives in memory only now — never localStorage. It doesn't
// survive a page reload (AuthContext re-establishes it via the httpOnly
// refresh cookie on boot), and it isn't sitting in browser storage for an
// XSS payload to read after the fact. Short-lived (15min) by design; see
// AuthContext for the session-bootstrap flow this depends on.
let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}

function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  // Double-submit CSRF token — read from the JS-readable csrfToken cookie
  // and echoed back as a header; see server/src/middleware/csrf.js.
  if (config.method !== 'get') {
    const csrf = getCsrfTokenFromCookie();
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

function clearSessionAndRedirectToLogin() {
  setAccessToken(null);
  if (window.location.pathname !== '/login') window.location.href = '/login';
}

let refreshPromise = null;
async function getRefreshedAccessToken() {
  if (!refreshPromise) {
    const csrf = getCsrfTokenFromCookie();
    refreshPromise = rawAxios
      .post('/auth/refresh', null, { headers: csrf ? { 'X-CSRF-Token': csrf } : {} })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retriedAfterRefresh && !original.url?.includes('/auth/')) {
      original._retriedAfterRefresh = true;
      try {
        const newToken = await getRefreshedAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        clearSessionAndRedirectToLogin();
        return Promise.reject(err);
      }
    }

    if (err.response?.status === 402 && window.location.pathname !== '/dashboard') {
      window.location.href = '/dashboard';
    }

    return Promise.reject(err);
  }
);

export default api;
