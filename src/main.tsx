import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App, { useAppStore } from "./App";
import "./styles.css";
import { supabase } from "./utils/supabaseClient";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    }
  }
});

// Decode JWT payload (base64url → base64 with padding → JSON)
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → standard base64, then add required padding
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// Check if JWT is not expired (with 10s buffer)
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp < (Date.now() / 1000) + 10;
}

function showLoopError() {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                  background:#f8fafc;gap:20px;padding:20px;text-align:center;">
        <div style="font-size:48px;">⚠️</div>
        <h2 style="color:#1e293b;margin:0;font-size:22px;">Session Error</h2>
        <p style="color:#64748b;margin:0;max-width:400px;line-height:1.6;">
          Unable to establish your session automatically. This may be due to an expired or invalid session.
        </p>
        <a href="https://secrtelecom.com/login?app=DP%26AM&subdomain=dpam&redirect_to=https://position.secrtelecom.com"
           style="background:#0076c0;color:#fff;padding:12px 28px;border-radius:8px;
                  text-decoration:none;font-weight:600;font-size:15px;margin-top:8px;">
          Login Again
        </a>
      </div>`;
  }
}

async function initSession() {
  const now = Date.now();

  let accessToken: string | null = null;

  // ── Step 1: URL query parameters (SSO redirect from portal — ALWAYS check first) ──
  let refreshToken: string | null = null;

  // ── Step 1a: URL hash fragment — Supabase's default redirect format ──
  // e.g. position.secrtelecom.com/#access_token=...&refresh_token=...
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const hashAccessToken = hashParams.get('access_token');
  const hashRefreshToken = hashParams.get('refresh_token');

  if (hashAccessToken) {
    console.log('[SSO] Token found in URL hash fragment');
    accessToken = hashAccessToken;
    refreshToken = hashRefreshToken;
    // Clear hash from URL immediately
    window.history.replaceState({}, '', window.location.pathname + window.location.search);
  }

  // ── Step 1b: URL query parameters — custom portal redirect format ──
  // e.g. position.secrtelecom.com/?access_token=...
  if (!accessToken) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlAccessToken = urlParams.get('access_token');
    const urlRefreshToken = urlParams.get('refresh_token');

    if (urlAccessToken) {
      console.log('[SSO] Token found in URL query params');
      accessToken = urlAccessToken;
      refreshToken = urlRefreshToken;
      urlParams.delete('access_token');
      urlParams.delete('refresh_token');
      const cleanSearch = urlParams.toString();
      window.history.replaceState({}, '', window.location.pathname + (cleanSearch ? '?' + cleanSearch : ''));
    }
  }

  // If we got a token from the URL, store it and clear any loop counters
  if (accessToken) {
    localStorage.setItem('telecom_jwt_token', accessToken);
    if (refreshToken) localStorage.setItem('telecom_refresh_token', refreshToken);
    // Tell Supabase about this session so it can refresh it later
    try {
      if (refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        console.log('[SSO] Supabase session established from URL token');
      }
    } catch (e: any) {
      console.warn('[SSO] Could not set Supabase session:', e.message);
    }
    // Clear stale loop-guard counters — this is a fresh login
    sessionStorage.removeItem('_dpam_redirect_ts');
    sessionStorage.removeItem('_dpam_redirect_count');
  }

  // ── LOOP GUARD — only when no URL token was present ──
  if (!accessToken) {
    const redirectTs = parseInt(sessionStorage.getItem('_dpam_redirect_ts') || '0');
    const redirectCount = parseInt(sessionStorage.getItem('_dpam_redirect_count') || '0');
    console.log(`[SSO] No URL token. Loop guard: count=${redirectCount}, age=${now - redirectTs}ms`);

    if (redirectTs > 0 && (now - redirectTs) < 30000 && redirectCount >= 3) {
      console.error('[SSO] Redirect loop detected — stopping after', redirectCount, 'attempts.');
      sessionStorage.removeItem('_dpam_redirect_ts');
      sessionStorage.removeItem('_dpam_redirect_count');
      localStorage.removeItem('telecom_jwt_token');
      localStorage.removeItem('telecom_user');
      showLoopError();
      return;
    }
  }

  // ── Step 2: Supabase cookie/storage session (wildcard cookie from Portal) ──
  if (!accessToken) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('[SSO] Supabase session:', session ? `found (expired=${isTokenExpired(session.access_token)})` : `none (${error?.message})`);
      if (session?.access_token && !isTokenExpired(session.access_token)) {
        accessToken = session.access_token;
        localStorage.setItem('telecom_jwt_token', accessToken);
      }
    } catch (e: any) {
      console.error('[SSO] getSession error:', e.message);
    }
  }

  // ── Step 3: Stored token in local private localStorage ──
  if (!accessToken) {
    const stored = localStorage.getItem('telecom_jwt_token');
    console.log('[SSO] localStorage token:', stored ? `found (expired=${isTokenExpired(stored)})` : 'none');
    if (stored && !isTokenExpired(stored)) {
      accessToken = stored;
      const storedRefresh = localStorage.getItem('telecom_refresh_token');
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: storedRefresh || ''
        });
        console.log('[SSO] Synced local token to Supabase cookie');
      } catch (e: any) {
        console.warn('[SSO] Could not sync local token to Supabase:', e.message);
      }
    }
  }

  // ── Step 4: Render or redirect ──
  if (accessToken) {
    console.log('[SSO] ✅ Session established — rendering app');
    sessionStorage.removeItem('_dpam_redirect_ts');
    sessionStorage.removeItem('_dpam_redirect_count');

    const payload = decodeJwtPayload(accessToken);
    const rawPhone = (payload?.phone as string) || '';
    const userPhone = rawPhone.replace(/^\+?91/, '') || rawPhone;
    const meta = payload?.user_metadata || {};

    const userObj = {
      id: payload?.sub || '',
      username: payload?.email || userPhone || '',
      name: meta.workerName || meta.fullName || payload?.email?.split('@')[0] || userPhone || 'User',
      role: (meta.role || 'STAFF').toUpperCase(),
      division: meta.division || 'BSP-HQ'
    };

    localStorage.setItem('telecom_user', JSON.stringify(userObj));
    useAppStore.getState().setToken(accessToken);
    useAppStore.getState().setUser(userObj);

    renderApp();
  } else {
    // No valid token — redirect to portal login
    const redirectTs = parseInt(sessionStorage.getItem('_dpam_redirect_ts') || '0');
    const redirectCount = parseInt(sessionStorage.getItem('_dpam_redirect_count') || '0');
    const newCount = (redirectTs > 0 && (now - redirectTs) < 30000) ? redirectCount + 1 : 1;
    console.warn(`[SSO] ❌ No token found — redirecting to portal (attempt ${newCount})`);
    sessionStorage.setItem('_dpam_redirect_ts', String(now));
    sessionStorage.setItem('_dpam_redirect_count', String(newCount));

    localStorage.removeItem('telecom_jwt_token');
    localStorage.removeItem('telecom_user');

    const origin = window.location.origin;
    const cleanPath = window.location.pathname;
    window.location.href = `https://secrtelecom.com/login?app=${encodeURIComponent("DP&AM")}&subdomain=dpam&path=${encodeURIComponent(cleanPath)}&redirect_to=${encodeURIComponent(origin)}`;
  }
}

function renderApp() {
  createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

initSession();
