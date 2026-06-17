"use client"

import { useState, useEffect } from "react"
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

type Product = { id: string; name: string; price: number; internalCode: string | null; barcode: string | null }
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

const fmt = (n: number) => "Gs. " + new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(n)

const headers = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
}

export default function OpticaPage() {
    const [tab, setTab] = useState<"cotizador" | "historial" | "configuracion" | "reglas">("cotizador")

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight italic">Módulo Óptica</h1>
                    <p className="text-sm text-slate-500 font-medium">Cotización y venta de lentes</p>
                </div>
            </div>

            <div className="flex gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700 w-fit">
                {[
                    { id: "cotizador" as const, label: "Cotizador", icon: "calculate" },
                    { id: "historial" as const, label: "Historial", icon: "history" },
                    { id: "configuracion" as const, label: "Configuración", icon: "settings" },
                    { id: "reglas" as const, label: "Reglas", icon: "auto_awesome" },
                ].map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${tab === t.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-white"}`}>
                        <span className="material-symbols-outlined text-lg">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === "cotizador" && <CotizadorTab />}
            {tab === "historial" && <HistorialTab />}
            {tab === "configuracion" && <ConfiguracionTab />}
            {tab === "reglas" && <ReglasTab />}
        </div>
    )
}

function CotizadorTab() {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [frames, setFrames] = useState<Product[]>([])
    const [lensTypes, setLensTypes] = useState<LensType[]>([])
    const [lensIndexes, setLensIndexes] = useState<LensIndex[]>([])
    const [lensExtras, setLensExtras] = useState<LensExtra[]>([])

    const [selectedCustomer, setSelectedCustomer] = useState<string>("")
    const [selectedFrame, setSelectedFrame] = useState<string>("")
    const [selectedLensType, setSelectedLensType] = useState<string>("")
    const [selectedLensIndex, setSelectedLensIndex] = useState<string>("")
    const [selectedExtras, setSelectedExtras] = useState<string[]>([])

    const [od, setOd] = useState({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })
    const [oi, setOi] = useState({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })

    const [calculating, setCalculating] = useState(false)
    const [result, setResult] = useState<any>(null)

    const toggleExtra = (id: string) => {
        setSelectedExtras(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    useEffect(() => {
        const h = headers()
        Promise.all([
            fetch(`${API_URL}/api/customers`, { headers: h }).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/api/products`, { headers: h }).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/api/optics-settings/lens-types`, { headers: h }).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/api/optics-settings/lens-indexes`, { headers: h }).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/api/optics-settings/lens-extras`, { headers: h }).then(r => r.ok ? r.json() : []),
        ]).then(([custs, prods, lTypes, lIndexes, extras]) => {
            setCustomers(custs)
            setFrames(prods)
            setLensTypes(lTypes)
            setLensIndexes(lIndexes)
            setLensExtras(extras)
        })
    }, [])

    const handleCalculate = async () => {
        if (!selectedLensType) return toast.error("Selecciona un tipo de lente")
        setCalculating(true)
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes/calculate`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    lensTypeId: selectedLensType,
                    lensIndexId: selectedLensIndex || null,
                    frameProductId: selectedFrame || null,
                    extraIds: selectedExtras,
                    odEsfera: od.esfera, odCilindro: od.cilindro, odEje: od.eje, odAdicion: od.adicion,
                    oiEsfera: oi.esfera, oiCilindro: oi.cilindro, oiEje: oi.eje, oiAdicion: oi.adicion,
                }),
            })
            if (!res.ok) throw new Error("Error al calcular")
            const data = await res.json()
            setResult(data)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        } finally {
            setCalculating(false)
        }
    }

    const handleSaveQuote = async () => {
        if (!result) return
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    customerId: selectedCustomer || null,
                    frameProductId: selectedFrame || null,
                    frameCode: result.frameCode || null,
                    frameDescription: result.frameDescription || null,
                    frameBrand: result.frameBrand || null,
                    framePrice: result.framePrice || null,
                    lensTypeId: selectedLensType,
                    lensTypeName: result.lensTypeName,
                    lensTypeBasePrice: result.lensTypeBasePrice,
                    lensIndexId: selectedLensIndex || null,
                    lensIndexName: result.lensIndexName || null,
                    lensIndexAdditionalPrice: result.lensIndexAdditionalPrice || 0,
                    extraIds: selectedExtras,
                    extrasTotalCost: result.extrasTotalCost,
                    odEsfera: od.esfera, odCilindro: od.cilindro, odEje: od.eje, odAdicion: od.adicion,
                    oiEsfera: oi.esfera, oiCilindro: oi.cilindro, oiEje: oi.eje, oiAdicion: oi.adicion,
                    subtotal: result.subtotal,
                    discountAmount: result.discountAmount,
                    total: result.total,
                    appliedRules: result.appliedRules || [],
                }),
            })
            if (!res.ok) throw new Error("Error al guardar")
            toast.success("Cotización guardada")
            setResult(null)
            setStep(1)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        }
    }

    const selectedFrameData = frames.find(f => f.id === selectedFrame)
    const selectedLensTypeData = lensTypes.find(l => l.id === selectedLensType)
    const selectedLensIndexData = lensIndexes.find(l => l.id === selectedLensIndex)

    const inputCls = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    const labelCls = "text-xs font-bold text-slate-400 uppercase tracking-wider"

    const steps = [
        { id: 1, label: "Datos" },
        { id: 2, label: "Cotizar" },
        { id: 3, label: "Confirmar" },
    ]

    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700">
            {/* Steps Header */}
            <div className="flex items-center px-6 py-4 border-b border-slate-700">
                {steps.map((s, i) => (
                    <div key={s.id} className="flex items-center">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest ${step === s.id ? "bg-primary text-white" : "text-slate-500"}`}>
                            <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{s.id}</span>
                            {s.label}
                        </div>
                        {i < steps.length - 1 && <div className="w-8 h-px bg-slate-600 mx-2" />}
                    </div>
                ))}
            </div>

            <div className="p-6">
                {step === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person</span>
                                Cliente y Marco
                            </h3>
                            <div>
                                <label className={labelCls}>Cliente</label>
                                <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className={inputCls}>
                                    <option value="">Seleccionar cliente...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Marco (producto)</label>
                                <select value={selectedFrame} onChange={e => setSelectedFrame(e.target.value)} className={inputCls}>
                                    <option value="">Sin marco</option>
                                    {frames.map(f => <option key={f.id} value={f.id}>{f.name} - {fmt(Number(f.price))}</option>)}
                                </select>
                            </div>
                            {selectedFrameData && (
                                <div className="bg-slate-700/50 rounded-xl p-4 space-y-1">
                                    <p className="text-xs text-slate-400">Código: <span className="text-white font-bold">{selectedFrameData.internalCode || "—"}</span></p>
                                    <p className="text-xs text-slate-400">Descripción: <span className="text-white font-bold">{selectedFrameData.name}</span></p>
                                    <p className="text-xs text-slate-400">Precio: <span className="text-white font-bold">{fmt(Number(selectedFrameData.price))}</span></p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">visibility</span>
                                Receta Oftálmica
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <p className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-widest">Ojo Derecho (OD)</p>
                                {["esfera", "cilindro", "eje", "adicion"].map(f => (
                                    <div key={`od-${f}`}>
                                        <label className={labelCls}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                                        <input type="number" step="0.25" value={od[f as keyof typeof od]} onChange={e => setOd({ ...od, [f]: parseFloat(e.target.value) || 0 })}
                                            className={inputCls} />
                                    </div>
                                ))}
                                <p className="col-span-2 text-xs font-black text-slate-400 uppercase tracking-widest mt-2">Ojo Izquierdo (OI)</p>
                                {["esfera", "cilindro", "eje", "adicion"].map(f => (
                                    <div key={`oi-${f}`}>
                                        <label className={labelCls}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                                        <input type="number" step="0.25" value={oi[f as keyof typeof oi]} onChange={e => setOi({ ...oi, [f]: parseFloat(e.target.value) || 0 })}
                                            className={inputCls} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 flex justify-end">
                            <button onClick={() => setStep(2)}
                                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95">
                                Siguiente — Lentes y Extras
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">lens</span>
                                Lente e Índice
                            </h3>
                            <div>
                                <label className={labelCls}>Tipo de Lente *</label>
                                <select value={selectedLensType} onChange={e => setSelectedLensType(e.target.value)} className={inputCls}>
                                    <option value="">Seleccionar...</option>
                                    {lensTypes.filter(l => l.isActive).map(l => <option key={l.id} value={l.id}>{l.name} — {fmt(l.basePrice)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Índice</label>
                                <select value={selectedLensIndex} onChange={e => setSelectedLensIndex(e.target.value)} className={inputCls}>
                                    <option value="">Sin índice adicional</option>
                                    {lensIndexes.filter(l => l.isActive).map(l => <option key={l.id} value={l.id}>{l.name} — +{fmt(l.additionalPrice)}</option>)}
                                </select>
                            </div>

                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mt-6">
                                <span className="material-symbols-outlined text-primary">checklist</span>
                                Extras
                            </h3>
                            <div className="space-y-2">
                                {lensExtras.filter(e => e.isActive).map(extra => (
                                    <label key={extra.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/50 cursor-pointer hover:bg-slate-700 transition-colors">
                                        <input type="checkbox" checked={selectedExtras.includes(extra.id)}
                                            onChange={() => toggleExtra(extra.id)} className="w-4 h-4 accent-primary" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">{extra.name}</p>
                                            <p className="text-xs text-slate-400">{fmt(extra.price)}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">summarize</span>
                                Resumen de Selección
                            </h3>

                            <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Marco:</span>
                                    <span className="text-white font-bold">{selectedFrameData?.name || "—"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Tipo de lente:</span>
                                    <span className="text-white font-bold">{selectedLensTypeData?.name || "—"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Índice:</span>
                                    <span className="text-white font-bold">{selectedLensIndexData?.name || "—"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Extras:</span>
                                    <span className="text-white font-bold">{selectedExtras.length > 0 ? `${selectedExtras.length} seleccionados` : "Ninguno"}</span>
                                </div>
                            </div>

                            {result && (
                                <div className="bg-slate-700/50 rounded-xl p-4 space-y-2 border border-primary/30">
                                    <p className="text-xs font-black text-primary uppercase tracking-widest">Cotización</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Marco:</span>
                                        <span className="text-white">{fmt(result.framePrice || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Base lente ({result.lensTypeName}):</span>
                                        <span className="text-white">{fmt(result.lensTypeBasePrice)}</span>
                                    </div>
                                    {result.graduationCost > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Grad. ({result.graduationRangeName}):</span>
                                            <span className="text-white">{fmt(result.graduationCost)}</span>
                                        </div>
                                    )}
                                    {result.lensIndexAdditionalPrice > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Índice ({result.lensIndexName}):</span>
                                            <span className="text-white">{fmt(result.lensIndexAdditionalPrice)}</span>
                                        </div>
                                    )}
                                    {result.extrasTotalCost > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Extras:</span>
                                            <span className="text-white">{fmt(result.extrasTotalCost)}</span>
                                        </div>
                                    )}
                                    {result.appliedRules?.map((r: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm text-emerald-400">
                                            <span>{r.ruleName}:</span>
                                            <span>-{fmt(r.discountAmount)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-slate-600 pt-2 flex justify-between text-base font-black">
                                        <span className="text-white">TOTAL</span>
                                        <span className="text-primary">{fmt(result.total)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={handleCalculate} disabled={calculating || !selectedLensType}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50">
                                    {calculating ? "Calculando..." : "Calcular Precio"}
                                </button>
                                {result && (
                                    <button onClick={() => setStep(3)}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95">
                                        Confirmar Cotización
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-white transition-colors">
                                ← Volver a datos
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && result && (
                    <div className="max-w-lg mx-auto space-y-6">
                        <div className="text-center">
                            <span className="size-16 bg-emerald-900/50 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                <span className="material-symbols-outlined text-3xl">check_circle</span>
                            </span>
                            <h3 className="text-xl font-black text-white mt-4">Confirmar Cotización</h3>
                            <p className="text-sm text-slate-400">Revisa los detalles antes de guardar</p>
                        </div>

                        <div className="bg-slate-700/50 rounded-xl p-6 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Cliente:</span>
                                <span className="text-white font-bold">{customers.find(c => c.id === selectedCustomer)?.name || "Consumidor Final"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Marco:</span>
                                <span className="text-white font-bold">{result.frameDescription || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Lente:</span>
                                <span className="text-white font-bold">{result.lensTypeName}</span>
                            </div>
                            <hr className="border-slate-600" />
                            <div className="flex justify-between text-lg font-black">
                                <span className="text-white">Total</span>
                                <span className="text-primary">{fmt(result.total)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setStep(2)}
                                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
                                Volver
                            </button>
                            <button onClick={handleSaveQuote}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95">
                                Guardar Cotización
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HISTORIAL TAB
// ═══════════════════════════════════════════════════════════════════════════

function HistorialTab() {
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)

    const fetchQuotes = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes`, { headers: headers() })
            if (res.ok) setQuotes(await res.json())
        } catch {
            toast.error("Error al cargar historial")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchQuotes() }, [])

    const handleConvert = async (id: string) => {
        if (!confirm("¿Convertir esta cotización en una venta?")) return
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes/${id}/convert`, {
                method: "PUT",
                headers: headers(),
            })
            if (!res.ok) throw new Error("Error al convertir")
            toast.success("Cotización convertida a venta")
            fetchQuotes()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        }
    }

    const handleCancel = async (id: string) => {
        if (!confirm("¿Cancelar esta cotización?")) return
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes/${id}/cancel`, {
                method: "PUT",
                headers: headers(),
            })
            if (res.ok) {
                toast.success("Cotización cancelada")
                fetchQuotes()
            }
        } catch {
            toast.error("Error al cancelar")
        }
    }

    if (loading) return <p className="text-center text-slate-500 py-12">Cargando...</p>

    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-widest">
                        <th className="text-left px-6 py-4">Cliente</th>
                        <th className="text-left px-4 py-4">Lente</th>
                        <th className="text-right px-4 py-4">Total</th>
                        <th className="text-center px-4 py-4">Estado</th>
                        <th className="text-left px-4 py-4">Fecha</th>
                        <th className="text-right px-6 py-4">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {quotes.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-slate-500">No hay cotizaciones</td></tr>
                    ) : quotes.map(q => (
                        <tr key={q.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-4 text-white font-bold">{q.customer?.name || "Consumidor Final"}</td>
                            <td className="px-4 py-4 text-slate-300">{q.lensTypeName || "—"}</td>
                            <td className="px-4 py-4 text-right text-white font-black">{fmt(q.total)}</td>
                            <td className="px-4 py-4 text-center">
                                <span className={`text-xs font-black px-2 py-1 rounded-full uppercase ${q.status === "QUOTE" ? "bg-blue-900 text-blue-300" : q.status === "CONVERTED" ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                                    {q.status === "QUOTE" ? "Cotización" : q.status === "CONVERTED" ? "Vendido" : "Cancelado"}
                                </span>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-400">{new Date(q.createdAt).toLocaleDateString("es-PY")}</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {q.status === "QUOTE" && (
                                        <>
                                            <button onClick={() => handleConvert(q.id)}
                                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-colors" title="Convertir a Venta">
                                                <span className="material-symbols-outlined text-lg">point_of_sale</span>
                                            </button>
                                            <button onClick={() => handleCancel(q.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors" title="Cancelar">
                                                <span className="material-symbols-outlined text-lg">cancel</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN TAB
// ═══════════════════════════════════════════════════════════════════════════

function ConfiguracionTab() {
    const [cfgTab, setCfgTab] = useState<"tipos" | "indices" | "extras" | "rangos">("tipos")

    const cfgTabs = [
        { id: "tipos" as const, label: "Tipos de Lente" },
        { id: "indices" as const, label: "Índices" },
        { id: "extras" as const, label: "Extras" },
        { id: "rangos" as const, label: "Rangos de Graduación" },
    ]

    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700">
            <div className="flex border-b border-slate-700">
                {cfgTabs.map(t => (
                    <button key={t.id} onClick={() => setCfgTab(t.id)}
                        className={`px-5 py-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${cfgTab === t.id ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
                        {t.label}
                    </button>
                ))}
            </div>
            <div className="p-6">
                {cfgTab === "tipos" && <LensTypesManager />}
                {cfgTab === "indices" && <LensIndexesManager />}
                {cfgTab === "extras" && <LensExtrasManager />}
                {cfgTab === "rangos" && <GraduationRangesManager />}
            </div>
        </div>
    )
}

function LensTypesManager() {
    const [items, setItems] = useState<LensType[]>([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: "", basePrice: 0, isActive: true })

    const fetchItems = async () => {
        const res = await fetch(`${API_URL}/api/optics-settings/lens-types`, { headers: headers() })
        if (res.ok) setItems(await res.json())
        setLoading(false)
    }
    useEffect(() => { fetchItems() }, [])

    const handleSave = async () => {
        if (!form.name) return toast.error("Nombre requerido")
        try {
            const url = editId
                ? `${API_URL}/api/optics-settings/lens-types/${editId}`
                : `${API_URL}/api/optics-settings/lens-types`
            const method = editId ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) })
            if (!res.ok) throw new Error("Error al guardar")
            toast.success(editId ? "Actualizado" : "Creado")
            setEditId(null)
            setForm({ name: "", basePrice: 0, isActive: true })
            fetchItems()
        } catch {
            toast.error("Error al guardar")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este tipo de lente?")) return
        const res = await fetch(`${API_URL}/api/optics-settings/lens-types/${id}`, { method: "DELETE", headers: headers() })
        if (res.ok) { toast.success("Eliminado"); fetchItems() }
    }

    if (loading) return <p className="text-slate-500">Cargando...</p>

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre (ej: Monofocal)" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: parseFloat(e.target.value) || 0 })} placeholder="Precio base" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />
                        Activo
                    </label>
                    <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">
                        {editId ? "Actualizar" : "Agregar"}
                    </button>
                    {editId && <button onClick={() => { setEditId(null); setForm({ name: "", basePrice: 0, isActive: true }) }} className="text-xs text-slate-400 hover:text-white">Cancelar</button>}
                </div>
            </div>
            <div className="space-y-2">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-white">{item.name}</p>
                            <p className="text-xs text-slate-400">{fmt(item.basePrice)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                                {item.isActive ? "Activo" : "Inactivo"}
                            </span>
                            <button onClick={() => { setEditId(item.id); setForm({ name: item.name, basePrice: item.basePrice, isActive: item.isActive }) }}
                                className="p-1 text-slate-400 hover:text-white">✏️</button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-400">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function LensIndexesManager() {
    const [items, setItems] = useState<LensIndex[]>([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: "", additionalPrice: 0, isActive: true })

    const fetchItems = async () => {
        const res = await fetch(`${API_URL}/api/optics-settings/lens-indexes`, { headers: headers() })
        if (res.ok) setItems(await res.json())
        setLoading(false)
    }
    useEffect(() => { fetchItems() }, [])

    const handleSave = async () => {
        if (!form.name) return toast.error("Nombre requerido")
        try {
            const url = editId ? `${API_URL}/api/optics-settings/lens-indexes/${editId}` : `${API_URL}/api/optics-settings/lens-indexes`
            const method = editId ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) })
            if (!res.ok) throw new Error("Error")
            toast.success(editId ? "Actualizado" : "Creado")
            setEditId(null); setForm({ name: "", additionalPrice: 0, isActive: true }); fetchItems()
        } catch { toast.error("Error al guardar") }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar?")) return
        const res = await fetch(`${API_URL}/api/optics-settings/lens-indexes/${id}`, { method: "DELETE", headers: headers() })
        if (res.ok) { toast.success("Eliminado"); fetchItems() }
    }

    if (loading) return <p className="text-slate-500">Cargando...</p>

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre (ej: 1.50)" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.additionalPrice} onChange={e => setForm({ ...form, additionalPrice: parseFloat(e.target.value) || 0 })} placeholder="Precio adicional" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />Activo
                    </label>
                    <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">{editId ? "Actualizar" : "Agregar"}</button>
                    {editId && <button onClick={() => { setEditId(null); setForm({ name: "", additionalPrice: 0, isActive: true }) }} className="text-xs text-slate-400 hover:text-white">Cancelar</button>}
                </div>
            </div>
            <div className="space-y-2">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-white">{item.name}</p>
                            <p className="text-xs text-slate-400">+{fmt(item.additionalPrice)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>{item.isActive ? "Activo" : "Inactivo"}</span>
                            <button onClick={() => { setEditId(item.id); setForm({ name: item.name, additionalPrice: item.additionalPrice, isActive: item.isActive }) }} className="p-1 text-slate-400 hover:text-white">✏️</button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-400">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function LensExtrasManager() {
    const [items, setItems] = useState<LensExtra[]>([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: "", price: 0, isActive: true })

    const fetchItems = async () => {
        const res = await fetch(`${API_URL}/api/optics-settings/lens-extras`, { headers: headers() })
        if (res.ok) setItems(await res.json())
        setLoading(false)
    }
    useEffect(() => { fetchItems() }, [])

    const handleSave = async () => {
        if (!form.name) return toast.error("Nombre requerido")
        try {
            const url = editId ? `${API_URL}/api/optics-settings/lens-extras/${editId}` : `${API_URL}/api/optics-settings/lens-extras`
            const method = editId ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) })
            if (!res.ok) throw new Error("Error")
            toast.success(editId ? "Actualizado" : "Creado")
            setEditId(null); setForm({ name: "", price: 0, isActive: true }); fetchItems()
        } catch { toast.error("Error al guardar") }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar?")) return
        const res = await fetch(`${API_URL}/api/optics-settings/lens-extras/${id}`, { method: "DELETE", headers: headers() })
        if (res.ok) { toast.success("Eliminado"); fetchItems() }
    }

    if (loading) return <p className="text-slate-500">Cargando...</p>

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre (ej: Antirreflejo)" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} placeholder="Precio" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />Activo
                    </label>
                    <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">{editId ? "Actualizar" : "Agregar"}</button>
                    {editId && <button onClick={() => { setEditId(null); setForm({ name: "", price: 0, isActive: true }) }} className="text-xs text-slate-400 hover:text-white">Cancelar</button>}
                </div>
            </div>
            <div className="space-y-2">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-white">{item.name}</p>
                            <p className="text-xs text-slate-400">{fmt(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>{item.isActive ? "Activo" : "Inactivo"}</span>
                            <button onClick={() => { setEditId(item.id); setForm({ name: item.name, price: item.price, isActive: item.isActive }) }} className="p-1 text-slate-400 hover:text-white">✏️</button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-400">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function GraduationRangesManager() {
    const [items, setItems] = useState<GraduationRange[]>([])
    const [loading, setLoading] = useState(true)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ minValue: 0, maxValue: 0, additionalCost: 0, isActive: true })

    const fetchItems = async () => {
        const res = await fetch(`${API_URL}/api/optics-settings/graduation-ranges`, { headers: headers() })
        if (res.ok) setItems(await res.json())
        setLoading(false)
    }
    useEffect(() => { fetchItems() }, [])

    const handleSave = async () => {
        try {
            const url = editId ? `${API_URL}/api/optics-settings/graduation-ranges/${editId}` : `${API_URL}/api/optics-settings/graduation-ranges`
            const method = editId ? "PUT" : "POST"
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(form) })
            if (!res.ok) throw new Error("Error")
            toast.success(editId ? "Actualizado" : "Creado")
            setEditId(null); setForm({ minValue: 0, maxValue: 0, additionalCost: 0, isActive: true }); fetchItems()
        } catch { toast.error("Error al guardar") }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar?")) return
        const res = await fetch(`${API_URL}/api/optics-settings/graduation-ranges/${id}`, { method: "DELETE", headers: headers() })
        if (res.ok) { toast.success("Eliminado"); fetchItems() }
    }

    if (loading) return <p className="text-slate-500">Cargando...</p>

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
                <input type="number" step="0.25" value={form.minValue} onChange={e => setForm({ ...form, minValue: parseFloat(e.target.value) || 0 })} placeholder="Mínimo" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" step="0.25" value={form.maxValue} onChange={e => setForm({ ...form, maxValue: parseFloat(e.target.value) || 0 })} placeholder="Máximo" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <input type="number" value={form.additionalCost} onChange={e => setForm({ ...form, additionalCost: parseFloat(e.target.value) || 0 })} placeholder="Costo adicional" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />Activo
                    </label>
                    <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">{editId ? "Actualizar" : "Agregar"}</button>
                    {editId && <button onClick={() => { setEditId(null); setForm({ minValue: 0, maxValue: 0, additionalCost: 0, isActive: true }) }} className="text-xs text-slate-400 hover:text-white">Cancelar</button>}
                </div>
            </div>
            <div className="space-y-2">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-white">{item.minValue} a {item.maxValue}</p>
                            <p className="text-xs text-slate-400">+{fmt(item.additionalCost)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${item.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>{item.isActive ? "Activo" : "Inactivo"}</span>
                            <button onClick={() => { setEditId(item.id); setForm({ minValue: item.minValue, maxValue: item.maxValue, additionalCost: item.additionalCost, isActive: item.isActive }) }} className="p-1 text-slate-400 hover:text-white">✏️</button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-400">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
//  REGLAS TAB
// ═══════════════════════════════════════════════════════════════════════════

function ReglasTab() {
    const [rules, setRules] = useState<PromotionalRule[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({
        name: "", description: "", ruleType: "FREE_EXTRA", targetId: "",
        conditionType: "", conditionValue: "", benefitType: "", benefitValue: "",
        isActive: true, startDate: "", endDate: "",
    })

    const fetchRules = async () => {
        const res = await fetch(`${API_URL}/api/promotional-rules`, { headers: headers() })
        if (res.ok) setRules(await res.json())
        setLoading(false)
    }
    useEffect(() => { fetchRules() }, [])

    const handleSave = async () => {
        if (!form.name) return toast.error("Nombre requerido")
        try {
            const url = editId ? `${API_URL}/api/promotional-rules/${editId}` : `${API_URL}/api/promotional-rules`
            const method = editId ? "PUT" : "POST"
            const body = {
                ...form,
                startDate: form.startDate || null,
                endDate: form.endDate || null,
                targetId: form.targetId || null,
                conditionValue: form.conditionValue || null,
            }
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) })
            if (!res.ok) throw new Error("Error")
            toast.success(editId ? "Actualizada" : "Creada")
            setShowForm(false); setEditId(null)
            setForm({ name: "", description: "", ruleType: "FREE_EXTRA", targetId: "", conditionType: "", conditionValue: "", benefitType: "", benefitValue: "", isActive: true, startDate: "", endDate: "" })
            fetchRules()
        } catch { toast.error("Error al guardar") }
    }

    const handleToggle = async (id: string) => {
        const res = await fetch(`${API_URL}/api/promotional-rules/${id}/toggle`, { method: "PUT", headers: headers() })
        if (res.ok) fetchRules()
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta regla?")) return
        const res = await fetch(`${API_URL}/api/promotional-rules/${id}`, { method: "DELETE", headers: headers() })
        if (res.ok) { toast.success("Eliminada"); fetchRules() }
    }

    const ruleTypeLabels: Record<string, string> = {
        FREE_EXTRA: "Extra Gratuito",
        DISCOUNT_LENS: "Dto. en Lente (%)",
        DISCOUNT_FRAME: "Dto. en Marco (%)",
        SPECIAL_COMBO: "Precio Especial Combo",
        DISCOUNT_TOTAL: "Dto. Total (%)",
    }

    if (loading) return <p className="text-center text-slate-500 py-12">Cargando...</p>

    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Reglas Promocionales</h3>
                <button onClick={() => { setEditId(null); setShowForm(!showForm) }}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest">
                    {showForm ? "Cancelar" : "Nueva Regla"}
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="Ej: Blue Cut gratis con marco X" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                            <select value={form.ruleType} onChange={e => setForm({ ...form, ruleType: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
                                {Object.entries(ruleTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</label>
                            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="Describe la regla..." />
                        </div>
                        {form.ruleType === "FREE_EXTRA" && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID del Extra a regalar</label>
                                <input value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="UUID del extra" />
                            </div>
                        )}
                        {form.ruleType === "DISCOUNT_LENS" && (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID del Tipo de Lente</label>
                                    <input value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dto. (%)</label>
                                    <input value={form.benefitValue} onChange={e => setForm({ ...form, benefitValue: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="10" />
                                </div>
                            </>
                        )}
                        {form.ruleType === "DISCOUNT_FRAME" && (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID del Producto (Marco)</label>
                                    <input value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dto. (%)</label>
                                    <input value={form.benefitValue} onChange={e => setForm({ ...form, benefitValue: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="15" />
                                </div>
                            </>
                        )}
                        {form.ruleType === "SPECIAL_COMBO" && (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID del Marco</label>
                                    <input value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID del Tipo de Lente</label>
                                    <input value={form.conditionValue} onChange={e => setForm({ ...form, conditionValue: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Precio Especial</label>
                                    <input value={form.benefitValue} onChange={e => setForm({ ...form, benefitValue: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                                </div>
                            </>
                        )}
                        {form.ruleType === "DISCOUNT_TOTAL" && (
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dto. Total (%)</label>
                                <input value={form.benefitValue} onChange={e => setForm({ ...form, benefitValue: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" placeholder="5" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inicio</label>
                            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fin</label>
                            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleSave}
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest">
                            {editId ? "Actualizar" : "Crear Regla"}
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {rules.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No hay reglas configuradas</p>
                ) : rules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white">{rule.name}</p>
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-600 text-slate-300 uppercase">{ruleTypeLabels[rule.ruleType] || rule.ruleType}</span>
                            </div>
                            <p className="text-xs text-slate-400">{rule.description}</p>
                            {rule.startDate && (
                                <p className="text-[10px] text-slate-500">Vigente: {new Date(rule.startDate).toLocaleDateString()} — {rule.endDate ? new Date(rule.endDate).toLocaleDateString() : "Sin fin"}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleToggle(rule.id)}
                                className={`px-2 py-1 rounded text-xs font-black uppercase tracking-widest ${rule.isActive ? "bg-emerald-900 text-emerald-300" : "bg-slate-600 text-slate-400"}`}>
                                {rule.isActive ? "Activa" : "Inactiva"}
                            </button>
                            <button onClick={() => handleDelete(rule.id)} className="p-1 text-slate-400 hover:text-rose-400">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
