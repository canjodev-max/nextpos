"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type LensType = { id: string; name: string; basePrice: number; isActive: boolean }
type LensIndex = { id: string; name: string; additionalPrice: number; isActive: boolean }
type LensExtra = { id: string; name: string; price: number; isActive: boolean }
type GraduationRange = { id: string; minValue: number; maxValue: number; additionalCost: number; isActive: boolean }
type PromotionalRule = {
    id: string; name: string; description: string; ruleType: string; targetId: string | null;
    conditionType: string | null; conditionValue: string | null; benefitType: string | null;
    benefitValue: string | null; isActive: boolean; startDate: string | null; endDate: string | null;
}
type FrameLensRule = { id: string; lensTypeId: string; frameProductId: string; specialPrice: number; isActive: boolean }
type Product = { id: string; name: string; price: number | string; internalCode: string | null }
type Customer = { id: string; name: string; email: string; phone: string; documentId?: string }
type Quote = {
    id: string; customerId: string | null; customer: Customer | null;
    frameProductId: string | null; frameCode: string | null; frameDescription: string | null;
    frameBrand: string | null; framePrice: number | null;
    lensTypeName: string | null; lensTypeBasePrice: number;
    lensIndexName: string | null; lensIndexAdditionalPrice: number;
    extrasTotalCost: number; subtotal: number; discountAmount: number; total: number;
    status: string; createdAt: string;
}

type OpticModuleModalProps = {
    isOpen: boolean
    onClose: () => void
    onAddLensToCart: (productId: string, quantity: number, price: number, customName: string) => Promise<void>
}

const fmt = (n: number) => "Gs. " + new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(n)
const token = () => localStorage.getItem("token")
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` })

export function OpticModuleModal({ isOpen, onClose, onAddLensToCart }: OpticModuleModalProps) {
    const [tab, setTab] = useState<"cotizador" | "historial" | "config" | "reglas">("cotizador")

    useEffect(() => {
        if (isOpen) setTab("cotizador")
    }, [isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-5xl max-h-[90vh] overflow-y-auto p-0">
                <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-6 pt-6 pb-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">visibility</span>
                                Módulo Óptica
                            </h2>
                            <p className="text-sm text-slate-400">Cotización y venta de lentes</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="flex gap-1">
                        {[
                            { id: "cotizador" as const, label: "Cotizador", icon: "calculate" },
                            { id: "historial" as const, label: "Historial", icon: "history" },
                            { id: "config" as const, label: "Configuración", icon: "settings" },
                            { id: "reglas" as const, label: "Reglas", icon: "auto_awesome" },
                        ].map((t) => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-black uppercase tracking-widest transition-all ${tab === t.id ? "bg-primary text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                                <span className="material-symbols-outlined text-lg">{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-6">
                    {tab === "cotizador" && <CotizadorSection onAddLensToCart={onAddLensToCart} />}
                    {tab === "historial" && <HistorialSection />}
                    {tab === "config" && <ConfigSection />}
                    {tab === "reglas" && <ReglasSection />}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  COTIZADOR
// ═══════════════════════════════════════════════════════════════════════════

function CotizadorSection({ onAddLensToCart }: { onAddLensToCart: OpticModuleModalProps["onAddLensToCart"] }) {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [lensTypes, setLensTypes] = useState<LensType[]>([])
    const [lensIndexes, setLensIndexes] = useState<LensIndex[]>([])
    const [lensExtras, setLensExtras] = useState<LensExtra[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])

    const [selectedCustomer, setSelectedCustomer] = useState("")
    const [selectedLensType, setSelectedLensType] = useState("")
    const [selectedLensIndex, setSelectedLensIndex] = useState("")
    const [selectedExtras, setSelectedExtras] = useState<string[]>([])

    const [od, setOd] = useState({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })
    const [oi, setOi] = useState({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })

    const [calculating, setCalculating] = useState(false)
    const [result, setResult] = useState<{
        lensTypeName: string; lensIndexName?: string; graduationRangeName?: string;
        extraNames: string[]; totalPrice: number;
        frameLensRuleApplied?: boolean; frameLensRuleLabel?: string;
    } | null>(null)
    const [saving, setSaving] = useState(false)

    const toggleExtra = (id: string) => {
        setSelectedExtras(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    useEffect(() => {
        if (step === 1) {
            const h = headers()
            Promise.all([
                fetch(`${API_URL}/api/optics-settings/lens-types`, { headers: h }).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}/api/optics-settings/lens-indexes`, { headers: h }).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}/api/optics-settings/lens-extras`, { headers: h }).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}/api/customers`, { headers: h }).then(r => r.ok ? r.json() : []),
            ]).then(([types, indexes, extras, custs]) => {
                setLensTypes(types); setLensIndexes(indexes); setLensExtras(extras); setCustomers(custs)
            })
        }
    }, [step])

    const handleCalculate = async () => {
        if (!selectedLensType) return toast.error("Selecciona un tipo de lente")
        setCalculating(true)
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes/calculate-lens-only`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    lensTypeId: selectedLensType,
                    lensIndexId: selectedLensIndex || null,
                    frameProductId: null,
                    extraIds: selectedExtras,
                    odEsfera: od.esfera, odCilindro: od.cilindro, odEje: od.eje, odAdicion: od.adicion,
                    oiEsfera: oi.esfera, oiCilindro: oi.cilindro, oiEje: oi.eje, oiAdicion: oi.adicion,
                }),
            })
            if (!res.ok) throw new Error("Error al calcular")
            setResult(await res.json())
            setStep(3)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        } finally { setCalculating(false) }
    }

    const handleAddToCart = async () => {
        if (!result) return
        setSaving(true)
        try {
            const prodRes = await fetch(`${API_URL}/api/optical-quotes/lens-product`, {
                headers: { Authorization: `Bearer ${token()}` }
            })
            if (!prodRes.ok) throw new Error("Error al obtener producto")
            const prod = await prodRes.json()

            const extraStr = result.extraNames.length > 0 ? ` + ${result.extraNames.join(" + ")}` : ""
            const gradStr = `(OD: ${od.esfera} / OI: ${oi.esfera})`
            const customName = `LENTE ${result.lensTypeName}${extraStr} ${gradStr}`

            await onAddLensToCart(prod.id, 1, result.totalPrice, customName)
            toast.success("Lente agregado al ticket")
            setStep(1)
            setSelectedLensType(""); setSelectedLensIndex(""); setSelectedExtras([])
            setOd({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })
            setOi({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })
            setResult(null)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        } finally { setSaving(false) }
    }

    const inputCls = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    const labelCls = "text-xs font-bold text-slate-400 uppercase tracking-wider"

    return (
        <div className="space-y-6">
            {/* Steps indicator */}
            <div className="flex items-center gap-1">
                {[{ id: 1, label: "Lente y Extras" }, { id: 2, label: "Graduación" }, { id: 3, label: "Confirmar" }].map((s, i) => (
                    <div key={s.id} className="flex items-center">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest ${step === s.id ? "bg-primary text-white" : "text-slate-500"}`}>
                            <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{s.id}</span>
                            {s.label}
                        </div>
                        {i < 2 && <div className="w-8 h-px bg-slate-600 mx-2" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Lens type, index, extras */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary">person</span>
                        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs">
                            <option value="">Sin cliente</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Tipo de Lente *</label>
                            <select value={selectedLensType} onChange={e => setSelectedLensType(e.target.value)} className={inputCls}>
                                <option value="">Seleccionar...</option>
                                {lensTypes.filter(l => l.isActive).map(l => (
                                    <option key={l.id} value={l.id}>{l.name} — {fmt(l.basePrice)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Índice</label>
                            <select value={selectedLensIndex} onChange={e => setSelectedLensIndex(e.target.value)} className={inputCls}>
                                <option value="">Sin índice adicional</option>
                                {lensIndexes.filter(l => l.isActive).map(l => (
                                    <option key={l.id} value={l.id}>{l.name} — +{fmt(l.additionalPrice)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <h3 className={labelCls + " mb-3 flex items-center gap-2"}>
                            <span className="material-symbols-outlined text-primary text-sm">toggle_on</span>
                            Extras
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {lensExtras.filter(e => e.isActive).map(extra => {
                                const active = selectedExtras.includes(extra.id)
                                return (
                                    <button key={extra.id} onClick={() => toggleExtra(extra.id)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-95 ${active ? "bg-primary/20 border-primary text-white" : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500"}`}>
                                        <span className={`material-symbols-outlined text-lg ${active ? "text-primary" : "text-slate-500"}`}>
                                            {active ? "check_circle" : "add_circle"}
                                        </span>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate">{extra.name}</p>
                                            <p className={`text-[10px] ${active ? "text-primary/80" : "text-slate-400"}`}>{fmt(extra.price)}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setStep(2)}
                            className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95">
                            Siguiente — Graduación
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Graduation */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">visibility</span>
                                Ojo Derecho (OD)
                            </h4>
                            {["esfera", "cilindro", "eje", "adicion"].map(f => (
                                <div key={`od-${f}`}>
                                    <label className={labelCls}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                                    <input type="number" step="0.25" value={od[f as keyof typeof od]}
                                        onChange={e => setOd({ ...od, [f]: parseFloat(e.target.value) || 0 })} className={inputCls} />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">visibility</span>
                                Ojo Izquierdo (OI)
                            </h4>
                            {["esfera", "cilindro", "eje", "adicion"].map(f => (
                                <div key={`oi-${f}`}>
                                    <label className={labelCls}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                                    <input type="number" step="0.25" value={oi[f as keyof typeof oi]}
                                        onChange={e => setOi({ ...oi, [f]: parseFloat(e.target.value) || 0 })} className={inputCls} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <button onClick={() => setStep(1)} className="px-6 py-3 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">
                            ← Volver
                        </button>
                        <button onClick={handleCalculate} disabled={calculating}
                            className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50">
                            {calculating ? "Calculando..." : "Calcular Precio"}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Result */}
            {step === 3 && result && (
                <div className="space-y-6">
                    <div className="bg-slate-800 rounded-xl p-6 space-y-3 border border-primary/30">
                        <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Resumen del Lente</p>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Tipo:</span>
                            <span className="text-white font-bold">{result.lensTypeName}</span>
                        </div>
                        {result.lensIndexName && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Índice:</span>
                                <span className="text-white font-bold">{result.lensIndexName}</span>
                            </div>
                        )}
                        {result.graduationRangeName && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Graduación:</span>
                                <span className="text-white font-bold">{result.graduationRangeName}</span>
                            </div>
                        )}
                        {result.extraNames.length > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Extras:</span>
                                <span className="text-white font-bold">{result.extraNames.join(", ")}</span>
                            </div>
                        )}
                        {result.frameLensRuleApplied && (
                            <div className="flex justify-between text-sm text-amber-400">
                                <span>Regla especial:</span>
                                <span className="font-bold">{result.frameLensRuleLabel}</span>
                            </div>
                        )}
                        <div className="border-t border-slate-600 pt-3 flex justify-between text-lg font-black">
                            <span className="text-white">TOTAL</span>
                            <span className="text-primary">{fmt(result.totalPrice)}</span>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-800/50 rounded-xl px-4 py-2">
                        OD: {od.esfera}/{od.cilindro}/{od.eje}/{od.adicion} &nbsp;|&nbsp; OI: {oi.esfera}/{oi.cilindro}/{oi.eje}/{oi.adicion}
                    </div>
                    <div className="flex justify-between">
                        <button onClick={() => { setStep(2); setResult(null) }} className="px-6 py-3 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">
                            ← Volver
                        </button>
                        <button onClick={handleAddToCart} disabled={saving}
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2">
                            {saving ? "Agregando..." : <><span className="material-symbols-outlined text-lg">add_shopping_cart</span> Agregar al Ticket</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HISTORIAL
// ═══════════════════════════════════════════════════════════════════════════

function HistorialSection() {
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)

    const fetchQuotes = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes`, { headers: headers() })
            if (res.ok) setQuotes(await res.json())
        } catch { toast.error("Error al cargar") }
        finally { setLoading(false) }
    }
    useEffect(() => { fetchQuotes() }, [])

    const handleConvert = async (id: string) => {
        if (!confirm("¿Convertir esta cotización en una venta?")) return
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes/${id}/convert`, { method: "PUT", headers: headers() })
            if (!res.ok) throw new Error("Error")
            toast.success("Convertida a venta"); fetchQuotes()
        } catch { toast.error("Error") }
    }

    const handleCancel = async (id: string) => {
        if (!confirm("¿Cancelar?")) return
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes/${id}/cancel`, { method: "PUT", headers: headers() })
            if (res.ok) { toast.success("Cancelada"); fetchQuotes() }
        } catch { toast.error("Error") }
    }

    if (loading) return <p className="text-center text-slate-500 py-8">Cargando...</p>

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-widest">
                        <th className="text-left px-4 py-3">Cliente</th>
                        <th className="text-left px-4 py-3">Lente</th>
                        <th className="text-right px-4 py-3">Total</th>
                        <th className="text-center px-4 py-3">Estado</th>
                        <th className="text-left px-4 py-3">Fecha</th>
                        <th className="text-right px-4 py-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {quotes.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-500">Sin cotizaciones</td></tr>
                    ) : quotes.map(q => (
                        <tr key={q.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                            <td className="px-4 py-3 text-white font-bold">{q.customer?.name || "Consumidor Final"}</td>
                            <td className="px-4 py-3 text-slate-300">{q.lensTypeName || "—"}</td>
                            <td className="px-4 py-3 text-right text-white font-black">{fmt(q.total)}</td>
                            <td className="px-4 py-3 text-center">
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full uppercase ${q.status === "QUOTE" ? "bg-blue-900 text-blue-300" : q.status === "CONVERTED" ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                                    {q.status === "QUOTE" ? "Cotización" : q.status === "CONVERTED" ? "Vendido" : "Cancelado"}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">{new Date(q.createdAt).toLocaleDateString("es-PY")}</td>
                            <td className="px-4 py-3 text-right">
                                {q.status === "QUOTE" && (
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => handleConvert(q.id)}
                                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-colors" title="Convertir a Venta">
                                            <span className="material-symbols-outlined text-lg">point_of_sale</span>
                                        </button>
                                        <button onClick={() => handleCancel(q.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors" title="Cancelar">
                                            <span className="material-symbols-outlined text-lg">cancel</span>
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

function ConfigSection() {
    const [cfgTab, setCfgTab] = useState<"tipos" | "indices" | "extras" | "rangos" | "marcos">("tipos")

    const cfgTabs = [
        { id: "tipos" as const, label: "Tipos" },
        { id: "indices" as const, label: "Índices" },
        { id: "extras" as const, label: "Extras" },
        { id: "rangos" as const, label: "Rangos" },
        { id: "marcos" as const, label: "Precio x Marco" },
    ]

    return (
        <div className="space-y-4">
            <div className="flex gap-1 border-b border-slate-700">
                {cfgTabs.map(t => (
                    <button key={t.id} onClick={() => setCfgTab(t.id)}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${cfgTab === t.id ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
                        {t.label}
                    </button>
                ))}
            </div>
            {cfgTab === "tipos" && <ConfigManager endpoint="lens-types" fields={[{ key: "name", placeholder: "Nombre (ej: Monofocal)" }, { key: "basePrice", placeholder: "Precio base", type: "number" }]} />}
            {cfgTab === "indices" && <ConfigManager endpoint="lens-indexes" fields={[{ key: "name", placeholder: "Nombre (ej: 1.50)" }, { key: "additionalPrice", placeholder: "Precio adicional", type: "number" }]} />}
            {cfgTab === "extras" && <ConfigManager endpoint="lens-extras" fields={[{ key: "name", placeholder: "Nombre (ej: Antirreflejo)" }, { key: "price", placeholder: "Precio", type: "number" }]} />}
            {cfgTab === "rangos" && (
                <ConfigManager endpoint="graduation-ranges" fields={[
                    { key: "minValue", placeholder: "Mínimo", type: "number", step: "0.25" },
                    { key: "maxValue", placeholder: "Máximo", type: "number", step: "0.25" },
                    { key: "additionalCost", placeholder: "Costo adicional", type: "number" },
                ]} />
            )}
            {cfgTab === "marcos" && <FrameLensRulesManager />}
        </div>
    )
}

type FieldDef = { key: string; placeholder: string; type?: string; step?: string }

function ConfigManager({ endpoint, fields }: { endpoint: string; fields: FieldDef[] }) {
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<any>({})

    useEffect(() => {
        const fetchItems = async () => {
            const res = await fetch(`${API_URL}/api/optics-settings/${endpoint}`, { headers: headers() })
            if (res.ok) setItems(await res.json())
            setLoading(false)
        }
        fetchItems()
    }, [endpoint])

    const initForm = () => {
        const f: any = {}
        fields.forEach(fld => f[fld.key] = "")
        f.isActive = true
        return f
    }

    const handleSave = async () => {
        const payload: any = { ...form }
        fields.forEach(fld => {
            if (fld.type === "number") payload[fld.key] = parseFloat(payload[fld.key]) || 0
        })
        try {
            const url = editId ? `${API_URL}/api/optics-settings/${endpoint}/${editId}` : `${API_URL}/api/optics-settings/${endpoint}`
            const method = editId ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(payload) })
            if (!res.ok) throw new Error("Error")
            toast.success(editId ? "Actualizado" : "Creado")
            setEditId(null); setForm(initForm())
            const r = await fetch(`${API_URL}/api/optics-settings/${endpoint}`, { headers: headers() })
            if (r.ok) setItems(await r.json())
        } catch { toast.error("Error al guardar") }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar?")) return
        const res = await fetch(`${API_URL}/api/optics-settings/${endpoint}/${id}`, { method: "DELETE", headers: headers() })
        if (res.ok) {
            toast.success("Eliminado")
            const r = await fetch(`${API_URL}/api/optics-settings/${endpoint}`, { headers: headers() })
            if (r.ok) setItems(await r.json())
        }
    }

    if (loading) return <p className="text-slate-500">Cargando...</p>

    if (!editId && Object.keys(form).length === 0 && items.length > 0) setForm(initForm())

    return (
        <div className="space-y-4">
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${fields.length + 1}, 1fr)` }}>
                {fields.map(fld => (
                    <input key={fld.key} type={fld.type || "text"} step={fld.step}
                        value={form[fld.key] ?? ""}
                        onChange={e => setForm({ ...form, [fld.key]: e.target.value })}
                        placeholder={fld.placeholder}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                ))}
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 whitespace-nowrap">
                        <input type="checkbox" checked={form.isActive ?? true}
                            onChange={e => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />
                        Activo
                    </label>
                    <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest whitespace-nowrap">
                        {editId ? "Actualizar" : "Agregar"}
                    </button>
                    {editId && <button onClick={() => { setEditId(null); setForm(initForm()) }} className="text-xs text-slate-400 hover:text-white">Cancelar</button>}
                </div>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
                {items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-2.5">
                        <div className="flex gap-4 text-sm">
                            {fields.map(fld => (
                                <span key={fld.key} className="text-white font-bold">{fld.type === "number" ? fmt(Number(item[fld.key])) : item[fld.key]}</span>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                                {item.isActive ? "Activo" : "Inactivo"}
                            </span>
                            <button onClick={() => { setEditId(item.id); const f: any = {}; fields.forEach(fld => f[fld.key] = item[fld.key]); f.isActive = item.isActive; setForm(f) }}
                                className="p-1 text-slate-400 hover:text-white">✏️</button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-400">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function FrameLensRulesManager() {
    const [items, setItems] = useState<FrameLensRule[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [lensTypes, setLensTypes] = useState<LensType[]>([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ lensTypeId: "", frameProductId: "", specialPrice: 0, isActive: true })

    useEffect(() => {
        const fetchItems = async () => {
            const [r, p, l] = await Promise.all([
                fetch(`${API_URL}/api/optics-settings/frame-lens-rules`, { headers: headers() }),
                fetch(`${API_URL}/api/products`, { headers: headers() }),
                fetch(`${API_URL}/api/optics-settings/lens-types`, { headers: headers() }),
            ])
            if (r.ok) setItems(await r.json())
            if (p.ok) setProducts(await p.json())
            if (l.ok) setLensTypes(await l.json())
            setLoading(false)
        }
        fetchItems()
    }, [])

    const handleSave = async () => {
        if (!form.lensTypeId || !form.frameProductId) return toast.error("Selecciona lente y marco")
        try {
            const url = editId ? `${API_URL}/api/optics-settings/frame-lens-rules/${editId}` : `${API_URL}/api/optics-settings/frame-lens-rules`
            const method = editId ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) })
            if (!res.ok) throw new Error("Error")
            toast.success(editId ? "Actualizado" : "Creado")
            setEditId(null); setForm({ lensTypeId: "", frameProductId: "", specialPrice: 0, isActive: true })
            const r = await fetch(`${API_URL}/api/optics-settings/frame-lens-rules`, { headers: headers() })
            if (r.ok) setItems(await r.json())
        } catch { toast.error("Error") }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar?")) return
        const res = await fetch(`${API_URL}/api/optics-settings/frame-lens-rules/${id}`, { method: "DELETE", headers: headers() })
        if (res.ok) {
            toast.success("Eliminado")
            const r = await fetch(`${API_URL}/api/optics-settings/frame-lens-rules`, { headers: headers() })
            if (r.ok) setItems(await r.json())
        }
    }

    if (loading) return <p className="text-slate-500">Cargando...</p>

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-400">Precio especial de lente cuando se combina con un marco específico</p>
            <div className="grid grid-cols-4 gap-3">
                <select value={form.lensTypeId} onChange={e => setForm({ ...form, lensTypeId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Tipo lente...</option>
                    {lensTypes.filter(l => l.isActive).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select value={form.frameProductId} onChange={e => setForm({ ...form, frameProductId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">Marco...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" value={form.specialPrice} onChange={e => setForm({ ...form, specialPrice: parseFloat(e.target.value) || 0 })} placeholder="Precio especial" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />Activo</label>
                    <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">{editId ? "Actualizar" : "Agregar"}</button>
                    {editId && <button onClick={() => { setEditId(null); setForm({ lensTypeId: "", frameProductId: "", specialPrice: 0, isActive: true }) }} className="text-xs text-slate-400 hover:text-white">Cancelar</button>}
                </div>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
                {items.map(item => {
                    const lens = lensTypes.find(l => l.id === item.lensTypeId)
                    const frame = products.find(p => p.id === item.frameProductId)
                    return (
                        <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-2.5">
                            <p className="text-sm font-bold text-white">{lens?.name || "—"} × {frame?.name || "—"} = <span className="text-primary">{fmt(item.specialPrice)}</span></p>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>{item.isActive ? "Activo" : "Inactivo"}</span>
                                <button onClick={() => { setEditId(item.id); setForm({ lensTypeId: item.lensTypeId, frameProductId: item.frameProductId, specialPrice: item.specialPrice, isActive: item.isActive }) }} className="p-1 text-slate-400 hover:text-white">✏️</button>
                                <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-400">🗑️</button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  REGLAS PROMOCIONALES
// ═══════════════════════════════════════════════════════════════════════════

function ReglasSection() {
    const [rules, setRules] = useState<PromotionalRule[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRules = async () => {
            const res = await fetch(`${API_URL}/api/promotional-rules`, { headers: headers() })
            if (res.ok) setRules(await res.json())
            setLoading(false)
        }
        fetchRules()
    }, [])

    const handleToggle = async (id: string, isActive: boolean) => {
        const res = await fetch(`${API_URL}/api/promotional-rules/${id}`, {
            method: "PUT",
            headers: headers(),
            body: JSON.stringify({ isActive })
        })
        if (res.ok) {
            setRules(prev => prev.map(r => r.id === id ? { ...r, isActive } : r))
            toast.success(isActive ? "Activada" : "Desactivada")
        }
    }

    const RULE_LABELS: Record<string, string> = {
        FREE_EXTRA: "Extra Gratis",
        DISCOUNT_LENS: "Dto. en Lente",
        DISCOUNT_FRAME: "Dto. en Marco",
        SPECIAL_COMBO: "Combo Especial",
        DISCOUNT_TOTAL: "Dto. Total",
    }

    if (loading) return <p className="text-slate-500">Cargando...</p>

    return (
        <div className="space-y-2">
            {rules.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Sin reglas promocionales</p>
            ) : rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white">{rule.name}</p>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-600 text-slate-300 uppercase">{RULE_LABELS[rule.ruleType] || rule.ruleType}</span>
                        </div>
                        <p className="text-xs text-slate-400">{rule.description}</p>
                    </div>
                    <button onClick={() => handleToggle(rule.id, !rule.isActive)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${rule.isActive ? "bg-primary" : "bg-slate-600"}`}>
                        <span className={`absolute top-0.5 size-5 bg-white rounded-full shadow transition-transform ${rule.isActive ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                </div>
            ))}
        </div>
    )
}
