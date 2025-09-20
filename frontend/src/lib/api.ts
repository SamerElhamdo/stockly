import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

const rawBase = import.meta.env?.VITE_API_BASE || "http://127.0.0.1:8000";
const API_BASE_URL = rawBase.replace(/\/$/, "");

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const isBrowser = typeof window !== "undefined";

const readToken = (key: string) => {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("Unable to read auth token", error);
    return null;
  }
};

const storeToken = (key: string, value?: string | null) => {
  if (!isBrowser) return;
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn("Unable to persist auth token", error);
  }
};

export const getAccessToken = () => readToken(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => readToken(REFRESH_TOKEN_KEY);

export const setAuthTokens = (access: string, refresh?: string) => {
  storeToken(ACCESS_TOKEN_KEY, access);
  if (typeof refresh === "string") {
    storeToken(REFRESH_TOKEN_KEY, refresh);
  }
};

export const clearAuthTokens = () => {
  storeToken(ACCESS_TOKEN_KEY, null);
  storeToken(REFRESH_TOKEN_KEY, null);
};

export const endpoints = {
  login: "/api/auth/login/",
  refresh: "/api/auth/refresh/",
  dashboardStats: "/api/dashboard/stats",
  products: "/api/v1/products/",
  productDetail: (id: number | string) => `/api/v1/products/${id}/`,
  productArchive: (id: number | string) => `/api/v1/products/${id}/archive/`,
  productRestore: (id: number | string) => `/api/v1/products/${id}/restore/`,
  categories: "/api/v1/categories/",
  categoryDetail: (id: number | string) => `/api/v1/categories/${id}/`,
  customers: "/api/v1/customers/",
  customerDetail: (id: number | string) => `/api/v1/customers/${id}/`,
  customerArchive: (id: number | string) => `/api/v1/customers/${id}/archive/`,
  customerRestore: (id: number | string) => `/api/v1/customers/${id}/restore/`,
  invoices: "/api/v1/invoices/",
  invoiceDetail: (id: number | string) => `/api/v1/invoices/${id}/`,
  invoiceAddItem: (id: number | string) => `/api/v1/invoices/${id}/add_item/`,
  invoiceConfirm: (id: number | string) => `/api/v1/invoices/${id}/confirm/`,
} as const;

export interface ApiListResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export const normalizeListResponse = <T>(data: unknown): ApiListResponse<T> => {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data as T[],
    };
  }

  if (typeof data === "object" && data !== null) {
    const cast = data as Record<string, unknown> & {
      results?: T[];
      count?: number;
      next?: string | null;
      previous?: string | null;
    };

    const results = Array.isArray(cast.results) ? cast.results : [];

    return {
      results,
      count: typeof cast.count === "number" ? cast.count : results.length,
      next: typeof cast.next === "string" ? cast.next : null,
      previous: typeof cast.previous === "string" ? cast.previous : null,
    };
  }

  return { count: 0, next: null, previous: null, results: [] };
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

const subscribeTokenRefresh = (callback: (token: string | null) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableConfig | undefined;

    const requestUrl = originalRequest?.url || "";
    const isAuthRequest = [endpoints.login, endpoints.refresh].some((endpoint) =>
      requestUrl.includes(endpoint)
    );

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearAuthTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (!token) {
              reject(error);
              return;
            }
            if (!originalRequest.headers) {
              originalRequest.headers = {};
            }
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshUrl = `${API_BASE_URL}${endpoints.refresh}`;
        const response = await axios.post(refreshUrl, { refresh: refreshToken });
        const newAccess = (response.data as { access?: string }).access;
        const newRefresh = (response.data as { refresh?: string }).refresh;

        if (newAccess) {
          setAuthTokens(newAccess, newRefresh ?? refreshToken);
          onRefreshed(newAccess);

          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;

          return apiClient(originalRequest);
        }

        clearAuthTokens();
        onRefreshed(null);
        return Promise.reject(error);
      } catch (refreshError) {
        clearAuthTokens();
        onRefreshed(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { API_BASE_URL };
