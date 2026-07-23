import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    })
  }

  return null
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  })
}

export async function scheduleLowStockAlert(productName: string, currentStock: number) {
  await scheduleLocalNotification(
    '⚠️ Estoque Baixo',
    `${productName} está com apenas ${currentStock} unidades em estoque.`,
    { type: 'LOW_STOCK' }
  )
}

export async function scheduleOpenCaixaAlert() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💰 Caixa Aberto',
      body: 'Seu caixa ainda está aberto. Não esqueça de fechar ao final do dia.',
      data: { type: 'OPEN_CAIXA' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 22,
      minute: 0,
    } as Notifications.DailyTriggerInput,
  })
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler)
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler)
}
