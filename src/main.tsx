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

// Check if JWT is not expired (with 60s buffer)
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp < (Date.now() / 1000) + 60;
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
  // ── LOOP GUARD: Stop redirecting after 2 attempts in 15 seconds ──
  const redirectTs = parseInt(sessionStorage.getItem('_dpam_redirect_ts') || '0');
  const redirectCount = parseInt(sessionStorage.getItem('_dpam_redirect_count') || '0');
  const now = Date.now();

  if (redirectTs > 0 && (now - redirectTs) < 15000 && redirectCount >= 2) {
    console.error('[SSO] Redirect loop detected after', redirectCount, 'attempts. Stopping.');
    sessionStorage.removeItem('_dpam_redirect_ts');
    sessionStorage.removeItem('_dpam_redirect_count');
    localStorage.removeItem('telecom_jwt_token');
    localStorage.removeItem('telecom_user');
    showLoopError();
    return;
  }

  let accessToken: string | null = null;

  // ── Step 1: URL query parameters (SSO redirect from portal — highest priority) ──
  const urlParams = new URLSearchParams(window.location.search);
  const urlAccessToken = urlParams.get('access_token');
  const urlRefreshToken = urlParams.get('refresh_token');

  if (urlAccessToken) {
    // Strip tokens from URL bar FIRST before anything else runs
    urlParams.delete('access_token');
    urlParams.delete('refresh_token');
    const cleanSearch = urlParams.toString();
    const cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);

    // Trust URL tokens from portal — use directly without expiry check
    // (Portal just generated them; they cannot be expired)
    accessToken = urlAccessToken;
    localStorage.setItem('telecom_jwt_token', accessToken);
    if (urlRefreshToken) {
      localStorage.setItem('telecom_refresh_token', urlRefreshToken);
    }
  }

  // ── Step 2: Stored token in localStorage ──
  if (!accessToken) {
    const stored = localStorage.getItem('telecom_jwt_token');
    if (stored && !isTokenExpired(stored)) {
      accessToken = stored;
    }
  }

  // ── Step 3: Supabase cookie session ──
  if (!accessToken) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && !isTokenExpired(session.access_token)) {
        accessToken = session.access_token;
        localStorage.setItem('telecom_jwt_token', accessToken);
      }
    } catch (e: any) {
      console.error('[SSO] getSession error:', e.message);
    }
  }

  // ── Step 4: Render or redirect ──
  if (accessToken) {
    // Success — reset loop counter
    sessionStorage.removeItem('_dpam_redirect_ts');
    sessionStorage.removeItem('_dpam_redirect_count');

    // Decode user info from JWT (no network call needed)
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
    // Record this redirect attempt for loop detection
    const newCount = (redirectTs > 0 && (now - redirectTs) < 15000) ? redirectCount + 1 : 1;
    sessionStorage.setItem('_dpam_redirect_ts', String(now));
    sessionStorage.setItem('_dpam_redirect_count', String(newCount));

    localStorage.removeItem('telecom_jwt_token');
    localStorage.removeItem('telecom_user');

    const origin = window.location.origin;
    const cleanPath = window.location.pathname + window.location.hash;
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
