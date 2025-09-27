import axios, { type AxiosRequestHeaders } from 'axios';
import Constants from 'expo-constants';
import mitt from 'mitt';

import { clearAuthTokens, getAccessToken } from '@/storage/auth-storage';

export type ApiEvents = {
  unauthorized: void;
};

export const apiEvents = mitt<ApiEvents>();

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE ||
  (Constants?.expoConfig?.extra?.apiBase as string | undefined) ||
  'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    const headers = (config.headers || {}) as AxiosRequestHeaders;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuthTokens();
      apiEvents.emit('unauthorized');
    }
    return Promise.reject(error);
  },
);

export const endpoints = {
  login: '/api/auth/login/',
  sendOtp: '/api/v1/auth/otp/send/',
  verifyOtp: '/api/v1/auth/otp/verify/',
  resetPassword: '/api/v1/auth/reset-password/',
  registerCompany: '/api/register-company/',
  dashboardStats: '/api/dashboard/stats',
  products: '/api/v1/products/',
  productDetail: (id: number) => `/api/v1/products/${id}/`,
  productArchive: (id: number) => `/api/v1/products/${id}/archive/`,
  productRestore: (id: number) => `/api/v1/products/${id}/restore/`,
  customers: '/api/v1/customers/',
  customerDetail: (id: number) => `/api/v1/customers/${id}/`,
  customerArchive: (id: number) => `/api/v1/customers/${id}/archive/`,
  customerRestore: (id: number) => `/api/v1/customers/${id}/restore/`,
  categories: '/api/v1/categories/',
  invoices: '/api/v1/invoices/',
  invoiceDetail: (id: number) => `/api/v1/invoices/${id}/`,
  invoiceConfirm: (id: number) => `/api/v1/invoices/${id}/confirm/`,
  returns: '/api/v1/returns/',
  returnDetail: (id: number) => `/api/v1/returns/${id}/`,
  returnApprove: (id: number) => `/api/v1/returns/${id}/approve/`,
  returnReject: (id: number) => `/api/v1/returns/${id}/reject/`,
  payments: '/api/v1/payments/',
  archiveProducts: '/api/v1/products/?archived=true',
  archiveCustomers: '/api/v1/customers/?archived=true',
  companyProfile: '/api/v1/company-profile/',
  users: '/api/v1/users/',
};

export const normalizeListResponse = <T = unknown>(data: any): { count: number; results: T[] } => {
  if (Array.isArray(data)) {
    return { count: data.length, results: data };
  }
  if (data && typeof data === 'object' && 'results' in data) {
    return { count: data.count ?? data.results?.length ?? 0, results: data.results as T[] };
  }
  return { count: 0, results: [] };
};
