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
  }
}

// General request helper
async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: any
): Promise<T> {
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

  return resJson;
}

// Type definitions matching backend models
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
}

export const api = {
  auth: {
    login: (body: any) => request<any>("POST", "/api/auth/login", body),
    register: (body: any) => request<any>("POST", "/api/auth/register", body),
    getProfile: () => request<ApiResponse<any>>("GET", "/api/auth/profile"),
    getUsers: (params?: any) => {
      const q = new URLSearchParams(params).toString();
      return request<ApiResponse<any[]>>("GET", `/api/auth${q ? `?${q}` : ""}`);
    },
    updateRole: (userId: string, body: any) => request<ApiResponse<any>>("PATCH", `/api/auth/${userId}/role`, body),
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
    sections: () => request<ApiResponse<any[]>>("GET", "/api/daily-position/sections"),
    createMajorSection: (body: any) => request<ApiResponse<any>>("POST", "/api/daily-position/major-sections", body),
    createSection: (body: any) => request<ApiResponse<any>>("POST", "/api/daily-position/sections", body),
    updateSection: (id: string, body: any) => request<ApiResponse<any>>("PATCH", `/api/daily-position/sections/${id}`, body),
    deleteSection: (id: string) => request<ApiResponse<any>>("DELETE", `/api/daily-position/sections/${id}`),
    importSections: (rows: any[]) => request<ApiResponse<any>>("POST", "/api/daily-position/sections/import", { rows }),
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
  settings: {
    auditLogs: () => request<ApiResponse<any[]>>("GET", "/api/reports/audit-logs"),
  },
};
