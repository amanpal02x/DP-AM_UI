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

// Decode JWT payload without verifying signature (safe for reading claims)
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// Check if JWT token is not yet expired (with 30s buffer)
function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  return payload.exp > (Date.now() / 1000) + 30;
}

async function initSession() {
  let accessToken: string | null = null;

  // ── LOOP GUARD: If we've been redirected more than once in 10 seconds, stop looping ──
  const lastRedirect = sessionStorage.getItem('_sso_redirect_ts');
  const redirectCount = parseInt(sessionStorage.getItem('_sso_redirect_count') || '0');
  const now = Date.now();
  if (lastRedirect && (now - parseInt(lastRedirect)) < 10000) {
    if (redirectCount >= 2) {
      // Stuck in a loop — clear everything and show error state
      console.error('[SSO] Redirect loop detected. Clearing session and stopping.');
      sessionStorage.removeItem('_sso_redirect_ts');
      sessionStorage.removeItem('_sso_redirect_count');
      localStorage.removeItem('telecom_jwt_token');
      localStorage.removeItem('telecom_user');
      document.getElementById('root')!.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;gap:16px;">
          <h2 style="color:#1e293b">Session Error</h2>
          <p style="color:#64748b">Unable to establish session. Please <a href="https://secrtelecom.com/login?app=DP%26AM&subdomain=dpam&redirect_to=https://position.secrtelecom.com" style="color:#0076c0">click here to login again</a>.</p>
        </div>`;
      return;
    }
  } else {
    // Reset counter if > 10s since last redirect
    sessionStorage.setItem('_sso_redirect_count', '0');
  }

  // ── Step 1: URL query parameters (SSO redirect from portal) ──
  const urlParams = new URLSearchParams(window.location.search);
  const urlAccessToken = urlParams.get('access_token');
  const urlRefreshToken = urlParams.get('refresh_token');

  if (urlAccessToken) {
    // Strip tokens from URL bar IMMEDIATELY before anything else
    urlParams.delete('access_token');
    urlParams.delete('refresh_token');
    const cleanSearch = urlParams.toString();
    const cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);

    // Only use if not expired
    if (isTokenValid(urlAccessToken)) {
      accessToken = urlAccessToken;
      localStorage.setItem('telecom_jwt_token', accessToken);
      // Store refresh token for supabase background refresh (optional)
      if (urlRefreshToken) {
        localStorage.setItem('telecom_refresh_token', urlRefreshToken);
      }
    }
  }

  // ── Step 2: Existing token in localStorage ──
  if (!accessToken) {
    const stored = localStorage.getItem('telecom_jwt_token');
    if (stored && isTokenValid(stored)) {
      accessToken = stored;
    }
  }

  // ── Step 3: Try Supabase session (cookie-based) ──
  if (!accessToken) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isTokenValid(session.access_token)) {
        accessToken = session.access_token;
        localStorage.setItem('telecom_jwt_token', accessToken);
      }
    } catch (e: any) {
      console.error('[SSO] getSession error:', e.message);
    }
  }

  // ── Step 4: Render app or redirect ──
  if (accessToken) {
    // Reset loop counter on success
    sessionStorage.removeItem('_sso_redirect_ts');
    sessionStorage.removeItem('_sso_redirect_count');

    // Build user object from JWT claims (no API call needed)
    const payload = decodeJwtPayload(accessToken);
    const rawPhone = payload?.phone as string | undefined;
    const userPhone = rawPhone?.startsWith('91') ? rawPhone.slice(2) : rawPhone;
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
    // No valid token found — redirect to central portal login
    // Record redirect to detect loops
    sessionStorage.setItem('_sso_redirect_ts', String(now));
    sessionStorage.setItem('_sso_redirect_count', String(redirectCount + 1));

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
