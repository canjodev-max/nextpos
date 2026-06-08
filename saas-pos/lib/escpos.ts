export const ESC = '\x1b'
export const GS = '\x1d'

export const EOL = '\n'

export function init(): Uint8Array {
  return new TextEncoder().encode(ESC + '@')
}

export function setCharset(charset: number = 0): Uint8Array {
  return new Uint8Array([0x1b, 0x52, charset])
}

export function setCharacterCodeTable(table: number = 0): Uint8Array {
  return new Uint8Array([0x1b, 0x74, table])
}

export function setFont(font: number = 0): Uint8Array {
  return new Uint8Array([0x1b, 0x4d, font])
}

export function bold(enable: boolean): Uint8Array {
  return new Uint8Array([0x1b, 0x45, enable ? 1 : 0])
}

export function underline(enable: boolean): Uint8Array {
  return new Uint8Array([0x1b, 0x2d, enable ? 1 : 0])
}

export function align(alignment: 'left' | 'center' | 'right'): Uint8Array {
  const map: Record<string, number> = { left: 0, center: 1, right: 2 }
  return new Uint8Array([0x1b, 0x61, map[alignment] ?? 0])
}

export function doubleHeight(enable: boolean): Uint8Array {
  return new Uint8Array([0x1d, 0x21, enable ? 0x10 : 0x00])
}

export function doubleWidth(enable: boolean): Uint8Array {
  return new Uint8Array([0x1d, 0x21, enable ? 0x20 : 0x00])
}

export function setCharSize(width: 0 | 1 | 2, height: 0 | 1 | 2): Uint8Array {
  const w = typeof width === 'number' ? Math.min(Math.max(width, 0), 2) : 0
  const h = typeof height === 'number' ? Math.min(Math.max(height, 0), 2) : 0
  const n = (h << 4) | w
  return new Uint8Array([0x1d, 0x21, n])
}

export function lineFeed(n: number = 1): Uint8Array {
  return new Uint8Array(Array(n).fill(0x0a))
}

export function text(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

export function textLine(str: string, n: number = 1): Uint8Array {
  const t = new TextEncoder().encode(str)
  const lf = new Uint8Array(Array(n).fill(0x0a))
  const combined = new Uint8Array(t.length + lf.length)
  combined.set(t, 0)
  combined.set(lf, t.length)
  return combined
}

export function separator(char: string = '-', width: number = 42): Uint8Array {
  return textLine(char.repeat(width))
}

export function cut(): Uint8Array {
  return new Uint8Array([0x1d, 0x56, 0x00])
}

export function cutPartial(): Uint8Array {
  return new Uint8Array([0x1d, 0x56, 0x01])
}

export function beep(): Uint8Array {
  return new Uint8Array([0x07])
}

export function openDrawer(): Uint8Array {
  return new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa])
}

type PrintDensity = 0 | 1 | 2 | 3

export async function rasterImage(
  imageUrl: string,
  maxWidth: number = 384,
  density: PrintDensity = 0
): Promise<Uint8Array> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const scale = Math.min(maxWidth / img.width, 1)
  const w = Math.floor(img.width * scale)
  const h = Math.floor(img.height * scale)
  canvas.width = w
  canvas.height = h
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  const imageData = ctx.getImageData(0, 0, w, h)
  const pixels = imageData.data
  const bytesPerRow = Math.ceil(w / 8)
  const rasterData = new Uint8Array(bytesPerRow * h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b
      const black = brightness < 128
      if (black) {
        const byteIdx = y * bytesPerRow + Math.floor(x / 8)
        rasterData[byteIdx] |= 0x80 >> (x % 8)
      }
    }
  }

  const xL = bytesPerRow & 0xff
  const xH = (bytesPerRow >> 8) & 0xff
  const yL = h & 0xff
  const yH = (h >> 8) & 0xff

  const header = new Uint8Array([0x1d, 0x76, 0x30, density, xL, xH, yL, yH])
  const combined = new Uint8Array(header.length + rasterData.length)
  combined.set(header, 0)
  combined.set(rasterData, header.length)
  return combined
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function money(amount: number): string {
  return 'Gs. ' + amount.toLocaleString('es-PY')
}

export function formatDate(d: Date): string {
  return d.toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
