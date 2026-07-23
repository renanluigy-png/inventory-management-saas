import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '@/store/auth.store'

export default function AuthLayout() {
  const token = useAuthStore((s) => s.token)
  if (token) return <Redirect href="/(app)/" />

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
    </Stack>
  )
}
