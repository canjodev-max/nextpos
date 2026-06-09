"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { loadSettings, saveSettings, applyTheme, type PosSettings } from "@/lib/settings"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null)
  const [s, setS] = useState<PosSettings>(loadSettings)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) try { setUser(JSON.parse(u)) } catch {}
  }, [])

  const update = (partial: Partial<PosSettings>) => {
    setS(prev => ({ ...prev, ...partial }))
    setSaved(false)
  }

  const handleSave = () => {
    const merged = saveSettings(s)
    applyTheme(merged)
    setS(merged)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">Configuración</h1>
          <p className="text-sm text-slate-500 font-medium">Personaliza tu perfil, marca y diseño del ticket</p>
        </div>
        <button onClick={handleSave}
          className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 flex items-center gap-3 ${saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'}`}>
          <span className="material-symbols-outlined">{saved ? 'check' : 'save'}</span>
          {saved ? 'Guardado' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Perfil */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">{user?.name || 'Usuario'}</h2>
            <p className="text-sm text-slate-500">{user?.email || ''}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{user?.role || ''}</p>
          </div>
        </div>
      </section>

      {/* Marca / Colores */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">palette</span>
          <h2 className="text-lg font-black uppercase tracking-tight">Marca y Apariencia</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">URL del Logo</label>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input type="text" value={s.logoUrl} onChange={e => update({ logoUrl: e.target.value })}
                  placeholder="https://ejemplo.com/logo.png"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-colors" />
              </div>
              {s.logoUrl && (
                <div className="size-14 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white shrink-0 flex items-center justify-center p-1">
                  <img src={s.logoUrl} alt="preview" className="max-w-full max-h-full object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nombre del Negocio</label>
            <input type="text" value={s.companyName} onChange={e => update({ companyName: e.target.value })}
              placeholder="Mi Negocio"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-colors" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Color Primario</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={s.primaryColor} onChange={e => update({ primaryColor: e.target.value })}
                className="size-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer" />
              <input type="text" value={s.primaryColor} onChange={e => update({ primaryColor: e.target.value })}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:border-primary transition-colors uppercase" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Color Secundario</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={s.secondaryColor} onChange={e => update({ secondaryColor: e.target.value })}
                className="size-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer" />
              <input type="text" value={s.secondaryColor} onChange={e => update({ secondaryColor: e.target.value })}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:border-primary transition-colors uppercase" />
            </div>
          </div>
        </div>
      </section>

      {/* Impresión */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">print</span>
          <h2 className="text-lg font-black uppercase tracking-tight">Impresión</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Print Server URL</label>
            <input type="text" value={s.printServerUrl} onChange={e => update({ printServerUrl: e.target.value })}
              placeholder="http://127.0.0.1:9876"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:border-primary transition-colors" />
            <p className="text-[10px] text-slate-400">Servidor local que envía texto sin formato a la impresora. Corre con <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold">node print-server/server.js</code></p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Nombre de Impresora</label>
            <input type="text" value={s.printerName} onChange={e => update({ printerName: e.target.value })}
              placeholder="(impresora predeterminada)"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-colors" />
            <p className="text-[10px] text-slate-400">Déjalo vacío para usar la impresora predeterminada del sistema</p>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-2">
          <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[10px]">¿Cómo funciona?</p>
          <p>1. El ticket se genera como <strong>texto plano de 80 columnas</strong> (sin HTML, sin tablas).</p>
          <p>2. Si el <strong>Print Server</strong> está corriendo, se envía el texto directamente a la impresora.</p>
          <p>3. Si no hay servidor, se abre el diálogo de impresión del navegador con el texto en un <code className="px-1 bg-slate-200 dark:bg-slate-700 rounded font-bold">&lt;pre&gt;</code>.</p>
          <p className="text-slate-400 mt-1">Para imágenes: en el futuro se usarán comandos ESC/POS vía el print server.</p>
        </div>
      </section>

      {/* Diseño del Ticket */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">receipt</span>
          <h2 className="text-lg font-black uppercase tracking-tight">Diseño del Ticket</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Encabezado</label>
            <input type="text" value={s.ticketHeader} onChange={e => update({ ticketHeader: e.target.value })}
              placeholder="TICKET DE VENTA"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-colors" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Pie de Ticket</label>
            <input type="text" value={s.ticketFooter} onChange={e => update({ ticketFooter: e.target.value })}
              placeholder="¡Gracias por su compra!"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-colors" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Color de Texto Principal</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={s.ticketColorPrimary} onChange={e => update({ ticketColorPrimary: e.target.value })}
                className="size-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer" />
              <input type="text" value={s.ticketColorPrimary} onChange={e => update({ ticketColorPrimary: e.target.value })}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:border-primary transition-colors uppercase" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Color de Texto Secundario</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={s.ticketColorSecondary} onChange={e => update({ ticketColorSecondary: e.target.value })}
                className="size-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer" />
              <input type="text" value={s.ticketColorSecondary} onChange={e => update({ ticketColorSecondary: e.target.value })}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none focus:border-primary transition-colors uppercase" />
            </div>
          </div>
        </div>

        {/* Preview del Ticket */}
        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Vista Previa del Ticket</p>
          <div className="bg-white border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-sm mx-auto" style={{ fontFamily: "'Courier New', monospace" }}>
            <div className="text-center space-y-1">
              {s.logoUrl && (
                <img src={s.logoUrl} alt="Logo" className="max-h-16 mx-auto mb-2 object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
              <div className="text-xs font-bold" style={{ color: s.ticketColorPrimary }}>{s.ticketHeader}</div>
              <div className="text-[10px]" style={{ color: s.ticketColorSecondary }}>{new Date().toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div className="text-[10px] tracking-wide my-2" style={{ color: s.ticketColorSecondary }}>{'─'.repeat(36)}</div>
            <div className="text-[10px] space-y-0.5" style={{ color: s.ticketColorPrimary }}>
              <div>Cliente: Consumidor Final</div>
              <div>Vendedor: {user?.name || 'Usuario'}</div>
            </div>
            <div className="text-[10px] tracking-wide my-2" style={{ color: s.ticketColorSecondary }}>{'─'.repeat(36)}</div>
            <div className="text-center text-[10px] font-bold" style={{ color: s.ticketColorPrimary }}>DETALLE</div>
            <div className="text-[10px] tracking-wide my-2" style={{ color: s.ticketColorSecondary }}>{'─'.repeat(36)}</div>
            <div className="text-[10px] space-y-0.5" style={{ color: s.ticketColorPrimary }}>
              <div>Producto Ejemplo</div>
              <div className="pl-2">2 x Gs. 5,000</div>
              <div className="text-right">Subtotal: Gs. 10,000</div>
            </div>
            <div className="text-[10px] tracking-wide my-2" style={{ color: s.ticketColorSecondary }}>{'─'.repeat(36)}</div>
            <div className="flex justify-between text-xs font-bold" style={{ color: s.ticketColorPrimary }}>
              <span>TOTAL</span><span>Gs. 10,000</span>
            </div>
            <div className="text-[10px] tracking-wide my-2" style={{ color: s.ticketColorSecondary }}>{'─'.repeat(36)}</div>
            <div className="text-center text-[10px]" style={{ color: s.ticketColorSecondary }}>{s.ticketFooter}</div>
          </div>
        </div>
      </section>
    </div>
  )
}
