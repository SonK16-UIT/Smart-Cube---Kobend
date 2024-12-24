import { Slot, useRouter, useSegments } from 'expo-router';
import AuthProvider, { useAuth } from '@/providers/AuthProvider';
import QueryProvider from '@/providers/QueryProvider';
import { View, Text } from 'react-native';
import "../global.css";
import { ThemeProvider } from '@/lib/ThemeContext';
import { useEffect } from 'react';

const MainLayout = () => {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Routes that do not require authentication
  const publicRoutes = ['signin', 'signup'];

  useEffect(() => {
    if (!loading) {
      const currentRoute = segments[1]; // Extract the second segment (e.g., "signin" or "signup")
      console.log("Current Route:", currentRoute);

      if (session) {
        // Redirect authenticated users to home if not on an authenticated route
        if (!['home', '(pages)'].includes(segments[0])) {
          router.replace('/(pages)/home');
        }
      } else {
        // Redirect unauthenticated users to signin unless on public routes
        if (!publicRoutes.includes(currentRoute)) {
          router.replace('/(auth)/signin');
        }
      }
    }
  }, [session, loading, segments, router]);

  if (loading) {
    // Loading screen while authentication state is resolving
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Ensure Slot is always rendered after layout setup
  return <Slot />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryProvider>
          <MainLayout />
        </QueryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
