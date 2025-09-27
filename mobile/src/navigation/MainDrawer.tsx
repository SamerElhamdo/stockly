import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { MainTabs } from './MainTabs';
import { Sidebar } from './Sidebar';

type DrawerParamList = {
  Tabs: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export const MainDrawer: React.FC = () => {
  return (
    <Drawer.Navigator
      // Explicitly disable legacy implementation to be compatible with Reanimated 3+
      useLegacyImplementation={false}
      screenOptions={{ headerShown: false, drawerType: 'front' }}
      drawerContent={(props) => <Sidebar {...props} />}
    >
      <Drawer.Screen name="Tabs" component={MainTabs} />
    </Drawer.Navigator>
  );
};


