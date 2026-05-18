const CONFIG_KEY = "autoseo_config"

export interface AppConfig {
  openaiApiKey: string
  hfApiKey?: string
  ffmpegDetected: boolean
  youtubeClientId?: string
  youtubeRefreshToken?: string
  blueskyHandle?: string
  blueskyAppPassword?: string
  setupCompleted: boolean
}

export function getConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppConfig
    if (!parsed.setupCompleted) return null
    return parsed
  } catch {
    return null
  }
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function isSetupNeeded(): boolean {
  return getConfig() === null
}
