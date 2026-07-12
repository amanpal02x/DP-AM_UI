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
  // Read the shared session cookie
  let { data: { session } } = await supabase.auth.getSession();
  
  // High-priority fallback: check URL query parameters for access_token and refresh_token
  // (Bypasses Incognito cookie block completely!)
  if (!session) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlAccessToken = urlParams.get('access_token');
      const urlRefreshToken = urlParams.get('refresh_token');
      
      if (urlAccessToken && urlRefreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: urlAccessToken,
          refresh_token: urlRefreshToken
        });
        if (error) {
          window.alert("URL setSession Error: " + error.message);
        } else {
          session = data.session;
          // Strip tokens from URL bar immediately to hide them from the user
          urlParams.delete('access_token');
          urlParams.delete('refresh_token');
          const cleanSearch = urlParams.toString();
          const cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    } catch (urlErr: any) {
      window.alert("URL session restore failed: " + urlErr.message);
    }
  }
  
  // Secondary fallback: cookie parsing
  if (!session) {
    try {
      const cookieName = 'sb-qfjerdspejaapggtvtwu-auth-token=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(';');
      let cookieValue = '';
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(cookieName) === 0) {
          cookieValue = c.substring(cookieName.length, c.length);
          break;
        }
      }
      if (cookieValue) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookieValue));
          if (parsed.access_token && parsed.refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token
            });
            if (error) {
              window.alert("Supabase setSession Error: " + error.message);
            }
            session = data.session;
          }
        } catch (jsonErr: any) {
          window.alert("JSON parsing of cookie failed: " + jsonErr.message);
        }
      }
    } catch (e: any) {
      window.alert("Cookie session restore error: " + e.message);
    }
  }
  
  if (session) {
    window.alert("Session recovered successfully! Token: " + session.access_token.substring(0, 15) + "...");
    localStorage.setItem("telecom_jwt_token", session.access_token);

    // Fetch the full user object separately (we stripped it from cookie to save space)
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
      if (!user) {
        window.alert("Supabase getUser returned null user profile!");
      }
    } catch (userErr: any) {
      window.alert("Supabase getUser threw exception: " + userErr.message);
    }
    
    // Sync user metadata to localStorage for profile details
    const meta = (user?.user_metadata) || {};
    const userObj = {
      id: user?.id || '',
      username: user?.email || user?.phone,
      name: meta.workerName || meta.fullName || user?.email?.split('@')[0] || user?.phone || 'User',
      role: (meta.role || 'user').toUpperCase(),
      division: meta.division || 'BSP-HQ'
    };
    localStorage.setItem("telecom_user", JSON.stringify(userObj));

    // CRITICAL: Update the Zustand store directly before rendering.
    // The store initializes at import time (before initSession runs), so it
    // reads a null token from localStorage. We must push the live values in
    // so App() renders the dashboard instead of the login screen.
    useAppStore.getState().setToken(session.access_token);
    useAppStore.getState().setUser(userObj);
    
    window.alert("Successfully set Zustand store! Rendering app...");
    // Render the React application
    renderApp();
  } else {
    window.alert("Session is null! Redirecting to central portal... Cookies present: " + document.cookie);
    // Clear storage and redirect to central portal
    localStorage.removeItem("telecom_jwt_token");
    localStorage.removeItem("telecom_user");
    const appName = "DP&AM";
    const subdomain = "dpam";
    const origin = window.location.origin;
    const path = window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `https://secrtelecom.com/login?app=${encodeURIComponent(appName)}&subdomain=${subdomain}&path=${encodeURIComponent(path)}&redirect_to=${encodeURIComponent(origin)}`;
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
