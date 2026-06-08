import { loadSettings } from './settings'

export function printTicket(
  items: { name: string; quantity: number; price: number; subtotal: number; originalPrice?: number; discountPercentage?: number }[],
  customerName: string | null,
  total: number,
  saleChange: number,
  paymentEntries: { method: string; amount: number }[]
): void {
  const s = loadSettings()
  const userData = localStorage.getItem('user')
  const vendedor = userData ? JSON.parse(userData).name : 'N/A'

  const sep = '─'.repeat(40)
  const fmt = (n: number) => 'Gs. ' + n.toLocaleString('es-PY')

  const itemLines = items.flatMap(item => {
    const lines: string[] = []
    lines.push(item.name)
    const hasDiscount = item.discountPercentage && item.discountPercentage > 0
    const orig = item.originalPrice ?? item.price
    const disc = item.price
    lines.push(hasDiscount
      ? `  ${item.quantity} x ${fmt(orig)} → ${fmt(disc)} (-${item.discountPercentage}%)`
      : `  ${item.quantity} x ${fmt(disc)}`)
    lines.push(`  Subtotal:`.padEnd(32) + fmt(item.subtotal))
    return lines
  }).join('\n')

  const methodsText = paymentEntries.map(e =>
    `${e.method}`.padEnd(32) + fmt(e.amount)
  ).join('\n')

  const dateStr = new Date().toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const changeText = saleChange > 0
    ? `\n<div class="change-line"><span>Vuelto</span><span>${fmt(saleChange)}</span></div>`
    : ''

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Ticket</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', 'Lucida Console', monospace;
    font-size: 10pt; width: 72mm; margin: 0 auto;
    padding: 2mm 0; color: ${s.ticketColorPrimary};
  }
  .ticket { width: 100%; }
  .logo { text-align: center; margin-bottom: 3mm; }
  .logo-img { max-width: 60mm; max-height: 25mm; }
  .header { text-align: center; font-weight: bold; font-size: 12pt; letter-spacing: 0.5pt; }
  .center { text-align: center; font-size: 9pt; color: ${s.ticketColorSecondary}; }
  .bold { font-weight: bold; }
  .sep { font-size: 8pt; letter-spacing: 0; margin: 1.5mm 0; }
  pre {
    font-family: 'Courier New', monospace;
    font-size: 9pt; white-space: pre; line-height: 1.3;
  }
  .items { margin: 1mm 0; }
  .methods { margin: 1mm 0; }
  .total-line {
    display: flex; justify-content: space-between;
    font-weight: bold; font-size: 11pt;
  }
  .change-line {
    display: flex; justify-content: space-between;
    font-size: 9pt; color: ${s.ticketColorSecondary};
  }
  .footer { text-align: center; font-size: 9pt; margin-top: 3mm; color: ${s.ticketColorSecondary}; }
  @media print { html, body { width: 80mm; } }
</style>
</head>
<body>
<div class="ticket">
  ${s.logoUrl ? `<div class="logo"><img src="${s.logoUrl}" alt="Logo" class="logo-img"></div>` : ''}
  <div class="header">${s.ticketHeader}</div>
  <div class="center">${dateStr}</div>
  <div class="sep">${sep}</div>
  <div>Cliente: ${customerName || 'Consumidor Final'}</div>
  <div>Vendedor: ${vendedor}</div>
  <div class="sep">${sep}</div>
  <div class="center bold">DETALLE</div>
  <div class="sep">${sep}</div>
  <pre class="items">${itemLines}</pre>
  <div class="sep">${sep}</div>
  <pre class="methods">${methodsText}</pre>
  <div class="sep">${sep}</div>
  <div class="total-line"><span>TOTAL</span><span>${fmt(total)}</span></div>${changeText}
  <div class="sep">${sep}</div>
  <div class="footer">${s.ticketFooter}</div>
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=400,height=600,menubar=no,toolbar=no,location=no')
  if (win) {
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  } else {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '-9999px'
    iframe.style.left = '-9999px'
    iframe.style.width = '320px'
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
}
