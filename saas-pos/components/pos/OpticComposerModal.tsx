"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type OpticComposerModalProps = {
    isOpen: boolean
    onClose: () => void
    onAddToCart: (productId: string, quantity: number, price: number, customName: string) => Promise<void>
    selectedFrameId?: string | null
}

type LensType = { id: string; name: string; basePrice: number; isActive: boolean }
type LensIndex = { id: string; name: string; additionalPrice: number; isActive: boolean }
type LensExtra = { id: string; name: string; price: number; isActive: boolean }

const fmt = (n: number) => "Gs. " + new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(n)

export function OpticComposerModal({ isOpen, onClose, onAddToCart, selectedFrameId }: OpticComposerModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [lensTypes, setLensTypes] = useState<LensType[]>([])
    const [lensIndexes, setLensIndexes] = useState<LensIndex[]>([])
    const [lensExtras, setLensExtras] = useState<LensExtra[]>([])

    const [selectedLensType, setSelectedLensType] = useState("")
    const [selectedLensIndex, setSelectedLensIndex] = useState("")
    const [selectedExtras, setSelectedExtras] = useState<string[]>([])

    const [od, setOd] = useState({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })
    const [oi, setOi] = useState({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })

    const [calculating, setCalculating] = useState(false)
    const [result, setResult] = useState<{
        lensTypeName: string; lensIndexName?: string; graduationRangeName?: string;
        extraNames: string[]; frameLensRuleApplied: boolean; frameLensRuleLabel?: string;
        totalPrice: number; lensProductId?: string; lensProductName?: string;
    } | null>(null)
    const [saving, setSaving] = useState(false)

    const toggleExtra = (id: string) => {
        setSelectedExtras(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setSelectedLensType("")
            setSelectedLensIndex("")
            setSelectedExtras([])
            setOd({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })
            setOi({ esfera: 0, cilindro: 0, eje: 0, adicion: 0 })
            setResult(null)

            const h = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }
            Promise.all([
                fetch(`${API_URL}/api/optics-settings/lens-types`, { headers: h }).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}/api/optics-settings/lens-indexes`, { headers: h }).then(r => r.ok ? r.json() : []),
                fetch(`${API_URL}/api/optics-settings/lens-extras`, { headers: h }).then(r => r.ok ? r.json() : []),
            ]).then(([types, indexes, extras]) => {
                setLensTypes(types)
                setLensIndexes(indexes)
                setLensExtras(extras)
            })
        }
    }, [isOpen])

    const handleCalculate = async () => {
        if (!selectedLensType) return toast.error("Selecciona un tipo de lente")
        setCalculating(true)
        try {
            const res = await fetch(`${API_URL}/api/optical-quotes/calculate-lens-only`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({
                    lensTypeId: selectedLensType,
                    lensIndexId: selectedLensIndex || null,
                    frameProductId: selectedFrameId || null,
                    extraIds: selectedExtras,
                    odEsfera: od.esfera, odCilindro: od.cilindro, odEje: od.eje, odAdicion: od.adicion,
                    oiEsfera: oi.esfera, oiCilindro: oi.cilindro, oiEje: oi.eje, oiAdicion: oi.adicion,
                }),
            })
            if (!res.ok) throw new Error("Error al calcular")
            const data = await res.json()
            setResult(data)
            setStep(3)
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        } finally {
            setCalculating(false)
        }
    }

    const handleAddToCart = async () => {
        if (!result) return
        setSaving(true)
        try {
            // Obtener producto genérico SERVICIO ÓPTICO
            const prodRes = await fetch(`${API_URL}/api/optical-quotes/lens-product`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            })
            if (!prodRes.ok) throw new Error("Error al obtener producto")
            const prod = await prodRes.json()

            // Construir nombre descriptivo
            const extraStr = result.extraNames.length > 0 ? ` + ${result.extraNames.join(" + ")}` : ""
            const gradStr = `(OD: ${od.esfera} / OI: ${oi.esfera})`
            const customName = `LENTE ${result.lensTypeName}${extraStr} ${gradStr}`

            await onAddToCart(prod.id, 1, result.totalPrice, customName)
            toast.success("Lente agregado al ticket")
            onClose()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        } finally {
            setSaving(false)
        }
    }

    const inputCls = "w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    const labelCls = "text-xs font-bold text-slate-400 uppercase tracking-wider"

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight italic">Componer Lente</h2>
                            <p className="text-sm text-slate-400">Armá el lente óptico para agregar al ticket</p>
                        </div>
                        <div className="flex gap-1">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`size-8 rounded-full flex items-center justify-center text-xs font-black ${step === s ? "bg-primary text-white" : "bg-slate-700 text-slate-500"}`}>{s}</div>
                            ))}
                        </div>
                    </div>

                    {/* Step 1: Tipo de Lente, Índice y Extras */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
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
                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-primary">toggle_on</span>
                                    Extras
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
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

                            <div className="flex justify-end gap-3">
                                <button onClick={onClose} className="px-6 py-2.5 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={() => setStep(2)}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all">
                                    Siguiente — Graduación
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Graduación */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
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

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setStep(1)} className="px-6 py-2.5 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">
                                    Volver
                                </button>
                                <button onClick={handleCalculate} disabled={calculating}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50">
                                    {calculating ? "Calculando..." : "Calcular Precio"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Resultado y confirmación */}
                    {step === 3 && result && (
                        <div className="space-y-6">
                            <div className="bg-slate-800 rounded-xl p-6 space-y-3 border border-primary/30">
                                <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Desglose del Lente</p>
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
                                        <span>Regla especial x marco:</span>
                                        <span className="font-bold">{result.frameLensRuleLabel}</span>
                                    </div>
                                )}
                                <div className="border-t border-slate-600 pt-3 flex justify-between text-lg font-black">
                                    <span className="text-white">PRECIO LENTE</span>
                                    <span className="text-primary">{fmt(result.totalPrice)}</span>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 bg-slate-800/50 rounded-xl px-4 py-3">
                                OD: {od.esfera} / {od.cilindro} / {od.eje} / {od.adicion} &nbsp;|&nbsp; OI: {oi.esfera} / {oi.cilindro} / {oi.eje} / {oi.adicion}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setStep(2)} className="px-6 py-2.5 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">
                                    Volver
                                </button>
                                <button onClick={handleAddToCart} disabled={saving}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2">
                                    {saving ? "Agregando..." : <>
                                        <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                                        Agregar al Ticket
                                    </>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
