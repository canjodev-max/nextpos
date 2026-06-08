import * as EscPos from './escpos'

let cachedPort: SerialPort | null = null

function isWebSerialAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

export async function connectPrinter(): Promise<SerialPort> {
  if (cachedPort) {
    try {
      await cachedPort.getInfo()
      return cachedPort
    } catch {
      cachedPort = null
    }
  }
  if (!isWebSerialAvailable()) {
    throw new Error('WebSerial no está disponible. Usa Chrome/Edge con HTTPS o localhost.')
  }
  const port = await navigator.serial.requestPort()
  await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' })
  cachedPort = port
  return port
}

export async function disconnectPrinter(): Promise<void> {
  if (cachedPort) {
    try { await cachedPort.close() } catch {}
    cachedPort = null
  }
}

export async function printRaw(data: Uint8Array): Promise<void> {
  const port = await connectPrinter()
  const writer = port.writable!.getWriter()
  try {
    await writer.write(data)
  } finally {
    writer.releaseLock()
  }
}

export async function printTicket(
  items: { name: string; quantity: number; price: number; subtotal: number; originalPrice?: number; discountPercentage?: number }[],
  customerName: string | null,
  total: number,
  saleChange: number,
  paymentEntries: { method: string; amount: number }[],
  logoUrl?: string | null
): Promise<void> {
  const chunks: Uint8Array[] = []
  const push = (...arrs: Uint8Array[]) => chunks.push(...arrs)

  push(EscPos.init())
  push(EscPos.setCharacterCodeTable(16))
  push(EscPos.align('center'))

  const userData = localStorage.getItem('user')
  const vendedor = userData ? JSON.parse(userData).name : 'N/A'

  if (logoUrl) {
    try {
      const imgData = await EscPos.rasterImage(logoUrl, 384)
      push(imgData)
      push(EscPos.lineFeed(1))
    } catch {}
  }

  push(EscPos.bold(true))
  push(EscPos.setCharSize(1, 1))
  push(EscPos.textLine('TICKET DE VENTA'))
  push(EscPos.setCharSize(0, 0))
  push(EscPos.bold(false))
  push(EscPos.lineFeed(1))
  push(EscPos.align('center'))
  push(EscPos.textLine(EscPos.formatDate(new Date())))
  push(EscPos.separator())
  push(EscPos.align('left'))
  push(EscPos.textLine('Cliente: ' + (customerName || 'Consumidor Final')))
  push(EscPos.textLine('Vendedor: ' + vendedor))
  push(EscPos.separator())
  push(EscPos.align('center'))
  push(EscPos.textLine('Detalle'))
  push(EscPos.separator())

  for (const item of items) {
    push(EscPos.align('left'))
    push(EscPos.bold(true))
    push(EscPos.textLine(item.name))
    push(EscPos.bold(false))

    const hasDiscount = item.discountPercentage && item.discountPercentage > 0
    const originalPrice = item.originalPrice ?? item.price
    const discountedPrice = item.price

    if (hasDiscount) {
      const line = `${item.quantity} x ${EscPos.money(originalPrice)} → ${EscPos.money(discountedPrice)} (-${item.discountPercentage}%)`
      push(EscPos.text('  '))
      push(EscPos.textLine(line))
    } else {
      const line = `${item.quantity} x ${EscPos.money(discountedPrice)}`
      push(EscPos.text('  '))
      push(EscPos.textLine(line))
    }

    const sub = '  Subtotal: ' + EscPos.money(item.subtotal)
    push(EscPos.align('right'))
    push(EscPos.textLine(sub))
    push(EscPos.lineFeed())
  }

  push(EscPos.separator())
  push(EscPos.align('left'))
  for (const pmt of paymentEntries) {
    push(EscPos.textLine(pmt.method + '  ' + EscPos.money(pmt.amount)))
  }
  push(EscPos.separator())
  push(EscPos.align('right'))
  push(EscPos.bold(true))
  push(EscPos.setCharSize(1, 1))
  push(EscPos.textLine('TOTAL: ' + EscPos.money(total)))
  push(EscPos.setCharSize(0, 0))
  push(EscPos.bold(false))

  if (saleChange > 0) {
    push(EscPos.textLine('Vuelto: ' + EscPos.money(saleChange)))
  }

  push(EscPos.lineFeed(2))
  push(EscPos.align('center'))
  push(EscPos.textLine('¡Gracias por su compra!'))
  push(EscPos.lineFeed(3))
  push(EscPos.cutPartial())

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
  const all = new Uint8Array(totalLength)
  let offset = 0
  for (const c of chunks) {
    all.set(c, offset)
    offset += c.length
  }

  await printRaw(all)
}
