import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Custom cookie-based storage helper to share Supabase session across subdomains of secrtelecom.com
const customCookieStorage = {
  getItem(key: string): string | null {
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return null;
  },
  setItem(key: string, value: string): void {
    const encoded = encodeURIComponent(value);
    const maxAge = 365 * 24 * 60 * 60; // 1 year persistence
    // Write session cookie to wildcard domain .secrtelecom.com
    document.cookie = `${key}=${encoded};path=/;domain=.secrtelecom.com;max-age=${maxAge};SameSite=Lax;Secure`;
    document.cookie = `${key}=${encoded};path=/;domain=secrtelecom.com;max-age=${maxAge};SameSite=Lax;Secure`;
  },
  removeItem(key: string): void {
    document.cookie = `${key}=;path=/;domain=.secrtelecom.com;expires=Thu, 01 Jan 1970 00:00:00 UTC;SameSite=Lax;Secure`;
    document.cookie = `${key}=;path=/;domain=secrtelecom.com;expires=Thu, 01 Jan 1970 00:00:00 UTC;SameSite=Lax;Secure`;
    document.cookie = `${key}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC;SameSite=Lax;Secure`;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customCookieStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false  // We handle URL tokens manually in main.tsx to avoid double-setSession loops
  },
});
