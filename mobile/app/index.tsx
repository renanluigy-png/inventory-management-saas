import { Redirect } from 'expo-router'
import { useAuthStore } from '@/store/auth.store'

export default function Index() {
  const token = useAuthStore((s) => s.token)
  return token ? <Redirect href="/(app)/" /> : <Redirect href="/(auth)/login" />
}
