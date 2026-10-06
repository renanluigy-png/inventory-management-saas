export const DEMO_EMAIL = 'admin@demo.com'
export const DEMO_SENHA = '123456'

export const DEMO_TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000
export const DEMO_TRIAL_STORAGE_KEY = 'cde-demo-trial-v1'

export interface DemoTrial {
  startedAt: number
  expiresAt: number
}

function readTrial(): DemoTrial | null {
  try {
    const raw = localStorage.getItem(DEMO_TRIAL_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<DemoTrial>
    if (
      typeof parsed.startedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.startedAt <= 0 ||
      parsed.expiresAt <= parsed.startedAt
    ) {
      localStorage.removeItem(DEMO_TRIAL_STORAGE_KEY)
      return null
    }

    return {
      startedAt: parsed.startedAt,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

export function getDemoTrial(): DemoTrial | null {
  return readTrial()
}

/**
 * Starts the demo only once. Logging out, refreshing or closing the browser
 * never resets the trial because it is persisted in localStorage.
 */
export function startDemoTrial(now = Date.now()): DemoTrial {
  const existing = readTrial()
  if (existing) return existing

  const trial: DemoTrial = {
    startedAt: now,
    expiresAt: now + DEMO_TRIAL_DURATION_MS,
  }

  try {
    localStorage.setItem(DEMO_TRIAL_STORAGE_KEY, JSON.stringify(trial))
  } catch {
    // The demo can still be used in browsers where storage is unavailable.
  }

  return trial
}

export function getDemoTrialRemainingMs(now = Date.now()): number {
  const trial = readTrial()
  if (!trial) return 0
  return Math.max(0, trial.expiresAt - now)
}

export function isDemoTrialExpired(now = Date.now()): boolean {
  const trial = readTrial()
  return !!trial && trial.expiresAt <= now
}
