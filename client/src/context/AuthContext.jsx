import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Nothing is stored in localStorage anymore, so the only way to know if
  // someone is still logged in after a page reload is to ask the server:
  // the httpOnly refresh cookie (invisible to this code) either gets us a
  // fresh access token or it doesn't. This silently logs the user back in
  // on every page load without them noticing — no visible "loading session"
  // flash for the common case.
  useEffect(() => {
    api
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return api.get('/auth/me');
      })
      .then(({ data }) => setUser(data))
      .catch(() => setAccessToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function login(payload) {
    const { data } = await api.post('/auth/login', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    // Best-effort — even if this fails (e.g. already-expired session), we
    // still clear local state so the UI reflects "logged out" immediately.
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
