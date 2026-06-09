import { loadSettings } from './settings'

const W = 80
const PRICE_COL = 48

function center(text: string): string {
  const pad = Math.max(0, Math.floor((W - text.length) / 2))
  return ' '.repeat(pad) + text
}

function r(val: string): string {
  return val.length >= W - PRICE_COL
    ? val.slice(0, W - PRICE_COL)
    : ' '.repeat(W - PRICE_COL - val.length) + val
}

function lr(left: string, right: string): string {
  const l = left.length > PRICE_COL ? left.slice(0, PRICE_COL) : left
  const rPadded = right.length > W - PRICE_COL ? right.slice(0, W - PRICE_COL) : ' '.repeat(W - PRICE_COL - right.length) + right
  return l + rPadded
}

function sep(char: string = '=', width: number = W): string {
  return char.repeat(width)
}

export function formatTicketText(
  items: { name: string; quantity: number; price: number; subtotal: number; originalPrice?: number; discountPercentage?: number }[],
  customerName: string | null,
  total: number,
  saleChange: number,
  paymentEntries: { method: string; amount: number }[]
): string {
  const s = loadSettings()
  const userData = localStorage.getItem('user')
  const vendedor = userData ? JSON.parse(userData).name : 'N/A'
  const fmt = (n: number) => 'Gs. ' + n.toLocaleString('es-PY')

  const dateStr = new Date().toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const lines: string[] = []

  lines.push(center(s.companyName || ''))

  if (s.logoUrl) {
    lines.push(center('[LOGO]'))
    lines.push('')
  }

  lines.push(center(s.ticketHeader))
  lines.push(center(dateStr))
  lines.push(sep())
  lines.push(`CLIENTE: ${customerName || 'Consumidor Final'}`)
  lines.push(`VENDEDOR: ${vendedor}`)
  lines.push(sep())
  lines.push(center('DETALLE'))
  lines.push(sep())

  for (const item of items) {
    lines.push(item.name.slice(0, W))

    const hasDiscount = item.discountPercentage && item.discountPercentage > 0
    const orig = item.originalPrice ?? item.price
    const disc = item.price

    if (hasDiscount) {
      lines.push(lr(`  ${item.quantity} x ${fmt(orig)}`, fmt(disc)))
      lines.push(lr(`  Desc: -${item.discountPercentage}%`, ''))
    } else {
      lines.push(lr(`  ${item.quantity} x ${fmt(disc)}`, fmt(item.subtotal)))
    }
  }

  lines.push(sep('-'))
  for (const pmt of paymentEntries) {
    lines.push(lr(pmt.method, fmt(pmt.amount)))
  }
  lines.push(sep('-'))

  lines.push(lr('TOTAL', fmt(total)))
  if (saleChange > 0) {
    lines.push(lr('VUELTO', fmt(saleChange)))
  }

  lines.push(sep())
  if (s.ticketFooter) {
    lines.push('')
    lines.push(center(s.ticketFooter))
  }
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

export function printTicket(
  items: { name: string; quantity: number; price: number; subtotal: number; originalPrice?: number; discountPercentage?: number }[],
  customerName: string | null,
  total: number,
  saleChange: number,
  paymentEntries: { method: string; amount: number }[]
): void {
  const text = formatTicketText(items, customerName, total, saleChange, paymentEntries)

  const s = loadSettings()
  const url = s.printServerUrl || 'http://127.0.0.1:9876'
  const params = s.printerName ? `?printer=${encodeURIComponent(s.printerName)}` : ''

  fetch(`${url}/print${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: text,
  }).then(res => {
    if (res.ok) return
    openTextPrint(text)
  }).catch(() => openTextPrint(text))
}

function openTextPrint(text: string) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Ticket</title>
<style>
  @page { size: 8.5in 11in; margin: 0.2in; }
  * { margin: 0; padding: 0; }
  body { font-family: 'Courier New', 'Lucida Console', monospace; font-size: 9pt; line-height: 1.15; white-space: pre; }
  pre { margin: 0; padding: 0; font-size: 9pt; line-height: 1.15; }
</style>
</head>
<body><pre>${escapeHtml(text)}</pre></body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no')
  if (win) {
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-9999px'
  iframe.style.width = '700px'
  iframe.style.height = '600px'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(html)
    doc.close()
    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
