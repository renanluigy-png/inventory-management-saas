import React, { useEffect } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuthStore } from '@/store/auth.store'
import { useThemeStore } from '@/store/theme.store'
import { registerForPushNotifications } from '@/services/notifications'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
    },
  },
})

export default function RootLayout() {
  const loadAuth = useAuthStore((s) => s.loadAuth)
  const isLoading = useAuthStore((s) => s.isLoading)
  const loadScheme = useThemeStore((s) => s.loadScheme)
  const scheme = useThemeStore((s) => s.scheme)

  useEffect(() => {
    async function init() {
      await Promise.all([loadAuth(), loadScheme()])
      registerForPushNotifications().catch(() => {})
      await SplashScreen.hideAsync()
    }
    init()
  }, [])

  if (isLoading) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
            <Stack.Screen name="(app)" options={{ animation: 'none' }} />
            <Stack.Screen name="scanner" options={{ animation: 'slide_from_bottom', gestureEnabled: true }} />
            <Stack.Screen name="stock" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="promotions" />
            <Stack.Screen name="caixa" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="product-form" />
            <Stack.Screen name="product-detail" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
