import { loadSettings } from './settings'

const W = 80

function center(text: string, width: number = W): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(pad) + text
}

function padRight(text: string, width: number = W): string {
  return text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length)
}

function line(sep: string = '─', width: number = W): string {
  return sep.repeat(width)
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

  if (s.logoUrl) {
    lines.push(center('[LOGO]'))
  }

  lines.push(center(s.ticketHeader))
  lines.push(center(dateStr))
  lines.push(line())

  lines.push(`Cliente: ${customerName || 'Consumidor Final'}`)
  lines.push(`Vendedor: ${vendedor}`)
  lines.push(line())
  lines.push(center('DETALLE'))
  lines.push(line())

  for (const item of items) {
    lines.push(item.name.slice(0, W))
    const hasDiscount = item.discountPercentage && item.discountPercentage > 0
    const orig = item.originalPrice ?? item.price
    const disc = item.price
    if (hasDiscount) {
      const qtyLine = `  ${item.quantity} x ${fmt(orig)} => ${fmt(disc)} (-${item.discountPercentage}%)`
      lines.push(qtyLine.slice(0, W))
    } else {
      lines.push(`  ${item.quantity} x ${fmt(disc)}`)
    }
    const sub = `  Subtotal:`.padEnd(W - 14) + fmt(item.subtotal)
    lines.push(sub)
  }

  lines.push(line())
  for (const pmt of paymentEntries) {
    const m = padRight(pmt.method, W - 14) + fmt(pmt.amount)
    lines.push(m)
  }
  lines.push(line())

  lines.push(padRight('TOTAL', W - 14) + fmt(total))
  if (saleChange > 0) {
    lines.push(padRight('Vuelto', W - 14) + fmt(saleChange))
  }

  lines.push(line())
  lines.push(center(s.ticketFooter))
  lines.push('')
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

  // 1. Intentar print server local
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
  @page { size: letter; margin: 0.3in; }
  * { margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', 'Lucida Console', monospace;
    font-size: 10pt; line-height: 1.1;
    white-space: pre;
  }
  pre { margin: 0; padding: 0; font-size: 10pt; line-height: 1.1; }
  @media print { body { width: 8in; } }
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
