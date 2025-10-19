import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export function setAuthTokens(access: string, refresh: string) {
  try {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {}
}

export function clearAuthTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const onAuthPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/auth');
      clearAuthTokens();
      if (!onAuthPage) {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Authentication
  login: '/api/auth/login/',
  // OTP & Auth flows
  sendOtp: '/api/v1/auth/otp/send/',
  verifyOtp: '/api/v1/auth/otp/verify/',
  resetPassword: '/api/v1/auth/reset-password/',
  registerCompany: '/api/register-company/',
  
  // App Config (public)
  appConfig: '/api/app-config/',
  
  // Dashboard
  dashboardStats: '/api/dashboard/stats',
  
  // Products
  products: '/api/v1/products/',
  productDetail: (id: number) => `/api/v1/products/${id}/`,
  productArchive: (id: number) => `/api/v1/products/${id}/archive/`,
  productRestore: (id: number) => `/api/v1/products/${id}/restore/`,
  
  // Customers
  customers: '/api/v1/customers/',
  customerDetail: (id: number) => `/api/v1/customers/${id}/`,
  customerArchive: (id: number) => `/api/v1/customers/${id}/archive/`,
  customerRestore: (id: number) => `/api/v1/customers/${id}/restore/`,
  
  // Categories
  categories: '/api/v1/categories/',
  categoryDetail: (id: number) => `/api/v1/categories/${id}/`,
  
  // Invoices
  invoices: '/api/v1/invoices/',
  invoiceDetail: (id: number) => `/api/v1/invoices/${id}/`,
  invoiceDetails: (id: number) => `/api/v1/invoices/${id}/`,
  invoiceAddItem: (id: number) => `/api/v1/invoices/${id}/add_item/`,
  invoiceRemoveItem: (id: number) => `/api/v1/invoices/${id}/remove_item/`,
  invoiceConfirm: (id: number) => `/api/v1/invoices/${id}/confirm/`,
  invoicePdf: (id: number) => `/api/v1/invoices/${id}/pdf/`,
  invoicePreview: (id: number) => `/api/v1/invoices/${id}/`, // same details endpoint; front renders preview
  
  // Returns
  returns: '/api/v1/returns/',
  returnApprove: (id: number) => `/api/v1/returns/${id}/approve/`,
  returnReject: (id: number) => `/api/v1/returns/${id}/reject/`,
  
  // Payments
  payments: '/api/v1/payments/',
  balances: '/api/v1/balances/',

  // Company Profile
  companyProfile: '/api/v1/company-profile/', // list returns single profile via overridden list
  companyProfileDetail: (id: number) => `/api/v1/company-profile/${id}/`,
  
  // Users
  users: '/api/v1/users/',
  companyUsers: '/api/v1/users/',
};

// Helpers
export function normalizeListResponse<T = unknown>(data: any): { count: number; next: string | null; previous: string | null; results: T[] } {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  if (data && typeof data === 'object' && 'results' in data) {
    return data as { count: number; next: string | null; previous: string | null; results: T[] };
  }
  return { count: 0, next: null, previous: null, results: [] };
}

// Common API response types
export interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  code?: string;
  fields?: Record<string, string[]>;
}
