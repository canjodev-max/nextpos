const express = require('express')
const cors = require('cors')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const app = express()
const PORT = 9876

app.use(cors())
app.use(express.text({ type: 'text/plain', limit: '1mb' }))
app.use(express.json({ limit: '1mb' }))

function getDefaultPrinter() {
  try {
    const result = execSync(
      'powershell -command "Get-CimInstance Win32_Printer -Filter \'Default=$true\' | Select-Object -ExpandProperty Name"',
      { encoding: 'utf8', timeout: 5000 }
    )
    return result.trim()
  } catch {
    return null
  }
}

function printRaw(text, printerName) {
  const tmpFile = path.join(os.tmpdir(), `pos_ticket_${Date.now()}.txt`)
  fs.writeFileSync(tmpFile, text, 'utf8')

  try {
    if (printerName) {
      execSync(`cmd /c print /D:"${printerName}" "${tmpFile}"`, {
        timeout: 10000,
        windowsHide: true,
      })
    } else {
      execSync(`cmd /c print "${tmpFile}"`, {
        timeout: 10000,
        windowsHide: true,
      })
    }
  } finally {
    try { fs.unlinkSync(tmpFile) } catch {}
  }
}

app.post('/print', (req, res) => {
  try {
    const text = typeof req.body === 'string' ? req.body : req.body.text
    if (!text) {
      return res.status(400).json({ error: 'No text provided' })
    }

    const printerName = req.query.printer || null
    printRaw(text, printerName)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/status', (req, res) => {
  const printer = getDefaultPrinter()
  res.json({
    running: true,
    defaultPrinter: printer || 'none',
    platform: process.platform,
  })
})

app.get('/printers', (req, res) => {
  try {
    const result = execSync(
      'powershell -command "Get-CimInstance Win32_Printer | Select-Object Name,Default | ConvertTo-Json"',
      { encoding: 'utf8', timeout: 5000 }
    )
    const printers = JSON.parse(result)
    res.json(Array.isArray(printers) ? printers : [printers])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`POS Print Server running on http://127.0.0.1:${PORT}`)
  const printer = getDefaultPrinter()
  if (printer) {
    console.log(`Default printer: ${printer}`)
  } else {
    console.log('Warning: No default printer found')
  }
})
