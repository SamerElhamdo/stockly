import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigate = <Name extends keyof RootStackParamList>(name: Name, params?: RootStackParamList[Name]) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
};


