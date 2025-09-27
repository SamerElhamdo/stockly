import Constants from 'expo-constants';

// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://127.0.0.1:8000'  // Development
  : 'https://stockly.encryptosystem.com';  // Production

// API Helper function
export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}, 
  token?: string
) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};