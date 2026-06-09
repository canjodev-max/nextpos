export type PosSettings = {
  logoUrl: string
  companyName: string
  primaryColor: string
  secondaryColor: string
  ticketHeader: string
  ticketFooter: string
  ticketColorPrimary: string
  ticketColorSecondary: string
  printServerUrl: string
  printerName: string
  ticketWidth: number
}

const DEFAULTS: PosSettings = {
  logoUrl: '',
  companyName: 'Mi Negocio',
  primaryColor: '#135bec',
  secondaryColor: '#6366f1',
  ticketHeader: 'TICKET DE VENTA',
  ticketFooter: '¡Gracias por su compra!',
  ticketColorPrimary: '#000000',
  ticketColorSecondary: '#555555',
  printServerUrl: 'http://127.0.0.1:9876',
  printerName: '',
  ticketWidth: 80,
}

export function loadSettings(): PosSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem('pos_settings')
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: Partial<PosSettings>): PosSettings {
  const current = loadSettings()
  const merged = { ...current, ...s }
  localStorage.setItem('pos_settings', JSON.stringify(merged))

  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      user.tenantName = merged.companyName || user.tenantName
      user.tenantLogoUrl = merged.logoUrl || user.tenantLogoUrl
      user.primaryColor = merged.primaryColor
      user.secondaryColor = merged.secondaryColor
      localStorage.setItem('user', JSON.stringify(user))
    } catch {}
  }

  return merged
}

export function applyTheme(settings: PosSettings) {
  const root = document.documentElement
  root.style.setProperty('--color-primary', settings.primaryColor)
  root.style.setProperty('--color-secondary', settings.secondaryColor)
  root.style.setProperty('--color-dark-primary', settings.primaryColor)
  root.style.setProperty('--color-dark-secondary', settings.secondaryColor)
}
