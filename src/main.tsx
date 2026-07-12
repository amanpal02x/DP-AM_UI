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

async function initSession() {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  // ── Step 1: Check URL query parameters (highest priority — SSO redirect from portal) ──
  const urlParams = new URLSearchParams(window.location.search);
  const urlAccessToken = urlParams.get('access_token');
  const urlRefreshToken = urlParams.get('refresh_token');

  if (urlAccessToken && urlRefreshToken) {
    accessToken = urlAccessToken;
    refreshToken = urlRefreshToken;

    // Immediately store the token in localStorage so App() renders the dashboard
    localStorage.setItem("telecom_jwt_token", accessToken);

    // Strip tokens from URL bar RIGHT NOW before doing anything else
    // This prevents Supabase or any listener from re-processing the URL
    urlParams.delete('access_token');
    urlParams.delete('refresh_token');
    const cleanSearch = urlParams.toString();
    const cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);

    // Now call setSession to register with Supabase auth (safe — URL is already cleaned)
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (!error && data.session) {
        // Update token in case Supabase refreshed it
        accessToken = data.session.access_token;
        localStorage.setItem("telecom_jwt_token", accessToken);
      } else if (error) {
        console.error("[SSO] setSession error:", error.message);
      }
    } catch (e: any) {
      console.error("[SSO] setSession threw:", e.message);
    }
  }

  // ── Step 2: Try existing Supabase session (cookie / localStorage) ──
  if (!accessToken) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        accessToken = session.access_token;
        localStorage.setItem("telecom_jwt_token", accessToken);
      }
    } catch (e: any) {
      console.error("[SSO] getSession threw:", e.message);
    }
  }

  // ── Step 3: Try reading the shared subdomain cookie directly ──
  if (!accessToken) {
    try {
      const cookieName = 'sb-qfjerdspejaapggtvtwu-auth-token=';
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        const c = ca[i].trim();
        if (c.startsWith(cookieName)) {
          const raw = c.substring(cookieName.length);
          try {
            const decoded = decodeURIComponent(raw);
            const parsed = JSON.parse(decoded);
            if (parsed.access_token && parsed.refresh_token) {
              const { data, error } = await supabase.auth.setSession({
                access_token: parsed.access_token,
                refresh_token: parsed.refresh_token
              });
              if (!error && data.session) {
                accessToken = data.session.access_token;
                localStorage.setItem("telecom_jwt_token", accessToken);
              }
            }
          } catch (_) { /* malformed cookie — ignore */ }
          break;
        }
      }
    } catch (e: any) {
      console.error("[SSO] Cookie parse threw:", e.message);
    }
  }

  // ── Step 4: Render or redirect ──
  if (accessToken) {
    // Sync user metadata to Zustand store
    let userObj = {
      id: '',
      username: '',
      name: 'User',
      role: 'STAFF',
      division: 'BSP-HQ'
    };

    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        const meta = user.user_metadata || {};
        userObj = {
          id: user.id || '',
          username: user.email || user.phone || '',
          name: meta.workerName || meta.fullName || user.email?.split('@')[0] || user.phone || 'User',
          role: (meta.role || 'STAFF').toUpperCase(),
          division: meta.division || 'BSP-HQ'
        };
      }
    } catch (e: any) {
      console.error("[SSO] getUser threw:", e.message);
    }

    localStorage.setItem("telecom_user", JSON.stringify(userObj));
    useAppStore.getState().setToken(accessToken);
    useAppStore.getState().setUser(userObj);

    renderApp();
  } else {
    // No session found anywhere — redirect to central portal login
    localStorage.removeItem("telecom_jwt_token");
    localStorage.removeItem("telecom_user");

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
