import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = '@stockly/access_token';
const REFRESH_KEY = '@stockly/refresh_token';
const USER_KEY = '@stockly/user_info';

type StoredUser = {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export const setAuthTokens = async (access: string, refresh: string) => {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
};

export const clearAuthTokens = async () => {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
};

export const getAccessToken = async () => {
  return AsyncStorage.getItem(ACCESS_KEY);
};

export const getRefreshToken = async () => {
  return AsyncStorage.getItem(REFRESH_KEY);
};

export const persistUser = async (user: StoredUser | null) => {
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(USER_KEY);
  }
};

export const readUser = async (): Promise<StoredUser | null> => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch (error) {
    console.warn('Failed to parse stored user', error);
    return null;
  }
};

export type { StoredUser };
