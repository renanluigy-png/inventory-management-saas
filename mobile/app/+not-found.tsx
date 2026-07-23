import { View, Text, StyleSheet } from 'react-native'
import { Link } from 'expo-router'

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Página não encontrada</Text>
      <Link href="/" style={styles.link}>
        Voltar ao início
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  code: { fontSize: 72, fontWeight: '700', color: '#6366f1' },
  title: { fontSize: 18, color: '#374151' },
  link: { color: '#6366f1', fontWeight: '600', marginTop: 8 },
})
