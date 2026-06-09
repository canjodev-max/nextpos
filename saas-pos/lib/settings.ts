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

function hexToRgb(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function overrideTag(id: string): HTMLStyleElement {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = id
    document.head.appendChild(el)
  }
  return el
}

const OPS: [string, number][] = [['5',0.05],['10',0.1],['20',0.2],['30',0.3],['40',0.4],['50',0.5],['60',0.6],['70',0.7],['80',0.8],['90',0.9],['95',0.95]]

export function applyTheme(settings: PosSettings) {
  const p = settings.primaryColor
  const s = settings.secondaryColor
  const prgb = hexToRgb(p)
  const srgb = hexToRgb(s)

  const root = document.documentElement
  root.style.setProperty('--color-primary', p)
  root.style.setProperty('--color-secondary', s)
  root.style.setProperty('--color-dark-primary', p)
  root.style.setProperty('--color-dark-secondary', s)

  // Tailwind v4 hardcodea los valores en las utilidades — inyectamos
  // un <style> que las sobreescribe dinámicamente.
  const el = overrideTag('tw-theme-override')
  const lines: string[] = []

  const pfx = (sel: string) => sel

  // plain
  lines.push(`.text-primary{color:${p}!important}`)
  lines.push(`.bg-primary{background-color:${p}!important}`)
  lines.push(`.border-primary{border-color:${p}!important}`)
  lines.push(`.ring-primary{--tw-ring-color:${p}!important}`)
  lines.push(`.accent-primary{accent-color:${p}!important}`)

  // hover
  lines.push(`.hover\\:text-primary:hover{color:${p}!important}`)
  lines.push(`.hover\\:bg-primary:hover{background-color:${p}!important}`)
  lines.push(`.hover\\:border-primary:hover{border-color:${p}!important}`)

  // focus
  lines.push(`.focus\\:text-primary:focus{color:${p}!important}`)
  lines.push(`.focus\\:bg-primary:focus{background-color:${p}!important}`)
  lines.push(`.focus\\:border-primary:focus{border-color:${p}!important}`)
  lines.push(`.focus\\:ring-primary:focus{--tw-ring-color:${p}!important}`)

  // group
  lines.push(`.group-hover\\:text-primary:is(:where(.group):hover *){color:${p}!important}`)
  lines.push(`.group-hover\\:bg-primary:is(:where(.group):hover *){background-color:${p}!important}`)
  lines.push(`.group-hover\\:ring-primary:is(:where(.group):hover *){--tw-ring-color:${p}!important}`)
  lines.push(`.group-focus-within\\:text-primary:is(:where(.group):focus-within *){color:${p}!important}`)

  // data-state
  lines.push(`.data-\\[state\\=checked\\]\\:bg-primary[data-state=checked]{background-color:${p}!important}`)

  // active
  lines.push(`.active\\:bg-primary:active{background-color:${p}!important}`)

  // opacity variants for bg, text, border, ring, shadow
  for (const [label, alpha] of OPS) {
    const a = `rgba(${prgb},${alpha})`
    lines.push(`.bg-primary\\/${label}{background-color:${a}!important}`)
    lines.push(`.text-primary\\/${label}{color:${a}!important}`)
    lines.push(`.border-primary\\/${label}{border-color:${a}!important}`)
    lines.push(`.ring-primary\\/${label}{--tw-ring-color:${a}!important}`)
    lines.push(`.shadow-primary\\/${label}{--tw-shadow-color:rgba(${prgb},${alpha})!important}`)
    // hover opacity
    lines.push(`.hover\\:bg-primary\\/${label}:hover{background-color:${a}!important}`)
    lines.push(`.hover\\:text-primary\\/${label}:hover{color:${a}!important}`)
    lines.push(`.hover\\:border-primary\\/${label}:hover{border-color:${a}!important}`)
    lines.push(`.hover\\:ring-primary\\/${label}:hover{--tw-ring-color:${a}!important}`)
    // focus opacity
    lines.push(`.focus\\:ring-primary\\/${label}:focus{--tw-ring-color:${a}!important}`)
    // group opacity
    lines.push(`.group-hover\\:shadow-primary\\/${label}:is(:where(.group):hover *){--tw-shadow-color:rgba(${prgb},${alpha})!important}`)
    // active opacity
    lines.push(`.active\\:bg-primary\\/${label}:active{background-color:${a}!important}`)
  }

  // secondary (only the ones actually used in the compiled CSS)
  lines.push(`.hover\\:bg-secondary\\/80:hover{background-color:rgba(${srgb},0.8)!important}`)

  el.textContent = lines.join('\n')
}
