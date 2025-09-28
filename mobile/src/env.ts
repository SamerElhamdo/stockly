// Deprecated; prefer using process.env.EXPO_PUBLIC_* directly
export const DEV_NO_AUTH: boolean = String(process.env.EXPO_PUBLIC_DEV_NO_AUTH || '').toLowerCase() === 'true';


