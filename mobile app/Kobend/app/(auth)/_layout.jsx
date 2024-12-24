import { useAuth } from '@/providers/AuthProvider';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    // Show loading spinner until authentication state is resolved
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Render public stack for signin and signup screens
  return (
    <Stack>
      <Stack.Screen
        name="signin"
        options={{ headerShown: false }} // Hide header for the sign-in screen
      />
      <Stack.Screen
        name="signup"
        options={{ headerShown: false }} // Hide header for the sign-up screen
      />
    </Stack>
  );
}
