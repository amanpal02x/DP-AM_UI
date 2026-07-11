import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
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
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // Sync Supabase access token to localStorage so the apiClient.ts can read it
    localStorage.setItem("telecom_jwt_token", session.access_token);

    // Fetch the full user object separately (we stripped it from cookie to save space)
    const { data: { user } } = await supabase.auth.getUser();
    
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
    
    // Render the React application
    renderApp();
  } else {
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
