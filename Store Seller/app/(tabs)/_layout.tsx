import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter, useFocusEffect } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View, ActivityIndicator } from "react-native";
import { jwtDecode } from "jwt-decode";
import * as React from "react";
import { clearAuthData, getValidToken } from "../utils/auth";

interface TokenPayload {
  exp: number;
  iat: number;
  _id: string;
  isAdmin: boolean;
  name: string;
  username: string;
}

export default function TabsLayout() {
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  const checkTokenValidity = async () => {
    try {
      // Use our utility to get a valid token (it handles expiration and clearing)
      const token = await getValidToken();
      
      if (!token) {
        console.log('No valid token found, logging out...');
        // Don't await logout here to prevent potential navigation issues
        logout();
        setIsTokenValid(false);
        return false;
      }
      
      // If we get here, the token is valid
      setIsTokenValid(true);
      return true;
    } catch (error) {
      console.error('Error checking token validity:', error);
      // Don't await logout here to prevent potential navigation issues
      logout();
      setIsTokenValid(false);
      return false;
    }
  };

  const router = useRouter();

  const logout = async () => {
    try {
      // Clear all auth data using our utility
      await clearAuthData();
      
      // Navigate to login screen and reset navigation stack
      router.replace({
        pathname: '/',
        params: { forceRefresh: Date.now() } // Force refresh to clear any cached data
      });
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we should still try to redirect to login
      router.replace('/');
    }
  };

  // Check token on initial load and when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkTokenValidity();
    }, [])
  );

  // Check token periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkTokenValidity();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Redirect to login if token is invalid
  useEffect(() => {
    if (isTokenValid === false) {
      Alert.alert(
        'Sessiya tugadi',
        'Iltimos, qaytadan kiring',
        [
          {
            text: 'OK',
            onPress: () => {
              logout();
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [isTokenValid]);
  if (isTokenValid === null) {
    // Show loading state while checking token
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (isTokenValid === false) {
    // Show nothing, the alert will handle the redirection
    return null;
  }

  return (
    <Tabs 
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Asosiy",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sotuvlar",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cart" size={24} color={color} />
          ),
        }}
      />
      {/* 
      Statistika sahifasi vaqtincha o'chirilgan. Kerak bo'lganda qayta yoqish uchun kommentdan chiqaring.
      <Tabs.Screen
        name="statistics"
        options={{
          headerShown: false,
          title: "Statistika",
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart" size={24} color={color} />
          ),
        }}
      />
      */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 