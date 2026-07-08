const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://dp-am-backend.onrender.com";

// Retrieve token from local storage
export function getAuthToken(): string | null {
  return localStorage.getItem("telecom_jwt_token");
}

// Store token in local storage
export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("telecom_jwt_token", token);
  } else {
    localStorage.removeItem("telecom_jwt_token");
  }
}

// Retrieve user from local storage
export function getCachedUser(): any | null {
  const userStr = localStorage.getItem("telecom_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

// Store user in local storage
export function setCachedUser(user: any | null) {
  if (user) {
    localStorage.setItem("telecom_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("telecom_user");
    Object.keys(localStorage)
      .filter(key => key.startsWith("telecom_dashboard_"))
      .forEach(key => localStorage.removeItem(key));
  }
}

// General request helper
async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: any
): Promise<T> {
  const startedAt = performance.now();
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    options.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (response.status === 401) {
    // Auto logout on token expiration/invalid
    setAuthToken(null);
    setCachedUser(null);
    window.location.reload();
  }

  const resJson = await response.json();

  if (!response.ok || resJson.success === false) {
    const error: any = new Error(resJson.message || `API request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  if (import.meta.env.DEV) {
    const duration = performance.now() - startedAt;
    if (duration >= 500) {
      console.info(`[API] ${method} ${path} completed in ${duration.toFixed(0)}ms`);
    }
  }

  return resJson;
}

// Type definitions matching backend models
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const api = {
  auth: {
    login: (body: any) => request<any>("POST", "/api/auth/login", body),
    register: (body: any) => request<any>("POST", "/api/auth/register", body),
    signup: (body: any) => request<any>("POST", "/api/auth/signup", body),
    sendOtp: (body: any) => request<any>("POST", "/api/auth/send-otp", body),
    verifyOtp: (body: any) => request<any>("POST", "/api/auth/verify-otp", body),
    sendSignupOtp: (body: any) => request<any>("POST", "/api/auth/send-signup-otp", body),
    getProfile: () => request<ApiResponse<any>>("GET", "/api/auth/profile"),
    getUsers: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any[]>>("GET", `/api/auth${q ? `?${q}` : ""}`);
    },
    updateRole: (userId: string, body: any) => request<ApiResponse<any>>("PATCH", `/api/auth/${userId}/role`, body),
    deleteUser: (userId: string) => request<ApiResponse<any>>("DELETE", `/api/auth/${userId}`),
    updateProfile: (body: any) => request<ApiResponse<any>>("PUT", "/api/auth/profile", body),
  },
  stations: {
    list: () => request<ApiResponse<any[]>>("GET", "/api/master/stations"),
    create: (body: any) => request<ApiResponse<any>>("POST", "/api/master/stations", body),
    importBatch: (body: any) => request<ApiResponse<any>>("POST", "/api/master/stations/batch", body),
    importUpload: (formData: FormData) => request<ApiResponse<any>>("POST", "/api/master/stations/import", formData),
    getImportStatus: (jobId: string) => request<ApiResponse<any>>("GET", `/api/master/stations/import/status/${jobId}`),
    update: (code: string, body: any) => request<ApiResponse<any>>("PATCH", `/api/master/stations/${code}`, body),
    delete: (code: string) => request<ApiResponse<any>>("DELETE", `/api/master/stations/${code}`),
  },
  assets: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any[]>>("GET", `/api/assets${q ? `?${q}` : ""}`);
    },
    getById: (id: string) => request<ApiResponse<any>>("GET", `/api/assets/${id}`),
    create: (body: any) => request<ApiResponse<any>>("POST", "/api/assets", body),
    update: (id: string, body: any) => request<ApiResponse<any>>("PATCH", `/api/assets/${id}`, body),
    delete: (id: string) => request<ApiResponse<any>>("DELETE", `/api/assets/${id}`),
    audit: (stationCode: string) => request<ApiResponse<any>>("GET", `/api/assets/audit?stationCode=${stationCode}`),
  },
  dailyPosition: {
    list: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any[]>>("GET", `/api/daily-position${q ? `?${q}` : ""}`);
    },
    summary: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any>>("GET", `/api/daily-position/summary${q ? `?${q}` : ""}`);
    },
    metadata: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any>>("GET", `/api/daily-position/metadata${q ? `?${q}` : ""}`);
    },
    create: (body: any) => request<ApiResponse<any>>("POST", "/api/daily-position", body),
    update: (id: string, body: any) => request<ApiResponse<any>>("PATCH", `/api/daily-position/${id}`, body),
    delete: (id: string) => request<ApiResponse<any>>("DELETE", `/api/daily-position/${id}`),
    sections: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any[]>>("GET", `/api/daily-position/sections${q ? `?${q}` : ""}`);
    },
    positionSummary: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any>>("GET", `/api/daily-position/position-summary${q ? `?${q}` : ""}`);
    },
    activeFaults: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any[]>>("GET", `/api/daily-position/active-faults${q ? `?${q}` : ""}`);
    },
    createMajorSection: (body: any) => request<ApiResponse<any>>("POST", "/api/daily-position/major-sections", body),
    createSection: (body: any) => request<ApiResponse<any>>("POST", "/api/daily-position/sections", body),
    updateSection: (id: string, body: any) => request<ApiResponse<any>>("PATCH", `/api/daily-position/sections/${id}`, body),
    deleteSection: (id: string) => request<ApiResponse<any>>("DELETE", `/api/daily-position/sections/${id}`),
    importSections: (rows: any[]) => request<ApiResponse<any>>("POST", "/api/daily-position/sections/import", { rows }),
    getMeggerLatest: (sectionName?: string) => request<ApiResponse<any>>("GET", `/api/daily-position/megger-latest${sectionName ? `?sectionName=${encodeURIComponent(sectionName)}` : ""}`),
  },
  gates: {
    list: () => request<ApiResponse<any[]>>("GET", "/api/gates"),
    create: (body: any) => request<ApiResponse<any>>("POST", "/api/gates", body),
    update: (id: string, body: any) => request<ApiResponse<any>>("PATCH", `/api/gates/${id}`, body),
    delete: (id: string) => request<ApiResponse<any>>("DELETE", `/api/gates/${id}`),
    getAssets: (gateId: string) => request<ApiResponse<any[]>>("GET", `/api/gates/${gateId}/assets`),
    addAsset: (gateId: string, body: any) => request<ApiResponse<any>>("POST", `/api/gates/${gateId}/assets`, body),
    deleteAsset: (assetId: string) => request<ApiResponse<any>>("DELETE", `/api/gates/assets/${assetId}`),
  },
  reports: {
    dashboard: (division?: string) => {
      const q = division ? `?division=${division}` : "";
      return request<ApiResponse<any>>("GET", `/api/reports/dashboard${q}`);
    },
  },
  feedback: {
    create: (body: any) => request<ApiResponse<any>>("POST", "/api/feedback", body),
    list: () => request<ApiResponse<any[]>>("GET", "/api/feedback"),
  },
  walkieTalkie: {
    listLobbies: () => request<ApiResponse<any[]>>("GET", "/api/walkie-talkie"),
    upsertLobby: (body: { lobbyName: string; totalWalkieTalkies: number; division?: string; walkieTalkies?: { serialNumber: string; makeModel: string }[] }) => request<ApiResponse<any>>("POST", "/api/walkie-talkie", body),
    recordTest: (body: { lobbyId: string; count?: number }) => request<ApiResponse<any>>("POST", "/api/walkie-talkie/test", body),
    resetTesting: (lobbyId: string) => request<ApiResponse<any>>("POST", "/api/walkie-talkie/reset", { lobbyId }),
    deleteLobby: (id: string) => request<ApiResponse<any>>("DELETE", `/api/walkie-talkie/${id}`),
  },
  announcements: {
    list: () => request<ApiResponse<any[]>>("GET", "/api/announcements"),
    create: (body: any) => request<ApiResponse<any>>("POST", "/api/announcements", body),
    update: (id: string, body: any) => request<ApiResponse<any>>("PUT", `/api/announcements/${id}`, body),
    delete: (id: string) => request<ApiResponse<any>>("DELETE", `/api/announcements/${id}`),
  },
  settings: {
    auditLogs: () => request<ApiResponse<any[]>>("GET", "/api/reports/audit-logs"),
  },
  screener: {
    getSavedQueries: () => request<ApiResponse<any[]>>("GET", "/api/screener/saved"),
    saveQuery: (body: any) => request<ApiResponse<any>>("POST", "/api/screener/saved", body),
    deleteQuery: (id: string) => request<ApiResponse<any>>("DELETE", `/api/screener/saved/${id}`),
    execute: (body: any) => request<ApiResponse<{ results: any[]; totalCount: number; summaryStats: any }>>("POST", "/api/screener/execute", body)
  }
};


