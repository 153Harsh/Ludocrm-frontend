import React from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Dashboard from './tabs/dashboard';
import Rank from './tabs/rank';
import Notification from './tabs/notification';
import Run from './tabs/run2';
import NewUpload from './tabs/newupload';
import Upload from './tabs/uploads';

const diceIcon = require('./assets/newAssets/bgdice.png');

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Run') {
            return <Image source={diceIcon} style={{ width: size + 4, height: size + 4, resizeMode: 'contain', tintColor: focused ? '#7600fd' : '#888' }} />;
          }
          const icons: Record<string, string> = {
            Dashboard: 'home',
            Rank: 'emoji-events',
            Notification: 'notifications',
            NewUpload: 'cloud-upload',
            Upload: 'thumb-up',
          };
          return <Icon name={icons[route.name]} size={size +  6} color={color} />;
        },
        tabBarActiveTintColor: '#7600fd',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#0B132B', height: 70, paddingBottom: 10, paddingTop: 6 },
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Run" component={Run} />
      <Tab.Screen name="Rank" component={Rank} />
      <Tab.Screen name="NewUpload" component={NewUpload} />
      <Tab.Screen name="Upload" component={Upload} />
      <Tab.Screen name="Notification" component={Notification} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
