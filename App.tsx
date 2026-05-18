import React from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from './auth/welcome';
import LoginScreen from './auth/login';
import TabNavigator from './TabNavigator';
import ProfileScreen from './tabs/profile';
import Toast from 'react-native-toast-message';
import { toastConfig } from './components/toast';
import {
  AuthProvider,
  useAuth,
} from './auth/AuthContext';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  dashboard: undefined;
  Profile: undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isLoading, session } =
    useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#7d46f2"
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={
          session
            ? 'dashboard'
            : 'Welcome'
        }
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
        />

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="dashboard"
          component={TabNavigator}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  const isDarkMode =
    useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={
          isDarkMode
            ? 'light-content'
            : 'dark-content'
        }
      />

      <AuthProvider>
        <AppNavigator />

        {/* ✅ GLOBAL TOAST */}
        <Toast config={toastConfig} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B132B',
  },
});

export default App;