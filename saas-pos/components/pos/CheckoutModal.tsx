import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { formatMoney } from '@/lib/utils'
import { printTicket } from '@/lib/printer'

import { API_URL } from "@/lib/api"

interface CheckoutModalProps {
    isOpen: boolean
    onClose: () => void
    saleId: string | null
    total: number
    onSuccess: () => void
    customerId: string | null
    customerName: string | null
    registerId: string | null
    items?: { name: string; quantity: number; price: number; subtotal: number; originalPrice?: number; discountPercentage?: number }[]
}

type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'CREDIT'

type PaymentEntry = {
    method: PaymentMethod
    amount: number
    dueDate?: string
}

const METHODS: { method: PaymentMethod; icon: string; label: string; subtitle: string; key: string }[] = [
    { method: 'CASH', icon: 'payments', label: 'Efectivo', subtitle: 'Billetes y Monedas', key: '1' },
    { method: 'CARD', icon: 'credit_card', label: 'Tarjeta (POS)', subtitle: 'Débito / Crédito', key: '2' },
    { method: 'QR', icon: 'qr_code_2', label: 'QR Pagos', subtitle: 'Billeteras Digitales', key: '3' },
    { method: 'CREDIT', icon: 'description', label: 'Crédito', subtitle: 'Cuenta Corriente', key: '4' },
]

const METHOD_COLORS: Record<PaymentMethod, { bg: string; border: string; shadow: string; text: string; hover: string; disabled: string; activeBg: string }> = {
    CASH: { bg: 'bg-emerald-500', border: 'border-emerald-400', shadow: 'shadow-emerald-500/20', text: 'text-emerald-500', hover: 'hover:border-emerald-500/50', disabled: 'opacity-40 grayscale cursor-not-allowed', activeBg: 'bg-emerald-500' },
    CARD: { bg: 'bg-primary', border: 'border-primary', shadow: 'shadow-primary/20', text: 'text-primary', hover: 'hover:border-primary/50', disabled: '', activeBg: 'bg-primary' },
    QR: { bg: 'bg-purple-600', border: 'border-purple-500', shadow: 'shadow-purple-600/20', text: 'text-purple-500', hover: 'hover:border-purple-500/50', disabled: '', activeBg: 'bg-purple-600' },
    CREDIT: { bg: 'bg-orange-600', border: 'border-orange-500', shadow: 'shadow-orange-600/20', text: 'text-orange-500', hover: 'hover:border-orange-500/50', disabled: 'opacity-40 grayscale cursor-not-allowed', activeBg: 'bg-orange-600' },
}

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000]

export default function CheckoutModal({
    isOpen,
    onClose,
    saleId,
    total,
    onSuccess,
    customerId,
    customerName,
    registerId,
    items = []
}: CheckoutModalProps) {
    const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([])
    const [cashReceived, setCashReceived] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [showPrintPrompt, setShowPrintPrompt] = useState(false)
    const [invoiceInfo, setInvoiceInfo] = useState<{ status: string; number?: string; url?: string } | null>(null)
    const [saleChange, setSaleChange] = useState(0)

    const cashInputRef = useRef<HTMLInputElement>(null)

    const allocated = paymentEntries.reduce((sum, e) => sum + e.amount, 0)
    const remaining = total - allocated
    const cashEntry = paymentEntries.find(e => e.method === 'CASH')
    const cashAmount = cashEntry?.amount ?? 0
    const cashReceivedNum = parseFloat(cashReceived || '0')
    const change = cashEntry ? Math.max(0, cashReceivedNum - cashAmount) : 0
    const cashShort = cashEntry ? Math.max(0, cashAmount - cashReceivedNum) : 0

    useEffect(() => {
        if (isOpen) {
            setPaymentEntries([])
            setCashReceived('')
            setLoading(false)
            setError(null)
            setSuccess(false)
            setShowPrintPrompt(false)
            setInvoiceInfo(null)
            setSaleChange(0)
        }
    }, [isOpen, total])

    useEffect(() => {
        if (paymentEntries.some(e => e.method === 'CASH') && cashInputRef.current) {
            setTimeout(() => cashInputRef.current?.focus(), 100)
        }
    }, [paymentEntries])

    const isDisabled = (method: PaymentMethod) => {
        if (method === 'CREDIT' && !customerId) return true
        return false
    }

    const toggleMethod = (method: PaymentMethod) => {
        if (isDisabled(method)) return
        const exists = paymentEntries.find(e => e.method === method)
        if (exists) {
            setPaymentEntries(prev => prev.filter(e => e.method !== method))
            if (method === 'CASH') setCashReceived('')
            return
        }
        if (remaining <= 0) return
        const entry: PaymentEntry = { method, amount: remaining }
        if (method === 'CREDIT') {
            const d = new Date()
            d.setDate(d.getDate() + 7)
            entry.dueDate = d.toISOString().slice(0, 10)
        }
        if (method === 'CASH') {
            setCashReceived(String(remaining))
        }
        setPaymentEntries(prev => [...prev, entry])
    }

    const updateAmount = (method: PaymentMethod, amount: number) => {
        const clamped = Math.max(0, Math.min(amount, total))
        const otherTotal = paymentEntries.filter(e => e.method !== method).reduce((s, e) => s + e.amount, 0)
        const maxAllowed = total - otherTotal
        setPaymentEntries(prev => prev.map(e =>
            e.method === method ? { ...e, amount: Math.min(clamped, maxAllowed) } : e
        ))
    }

    const updateDueDate = (method: PaymentMethod, dueDate: string) => {
        setPaymentEntries(prev => prev.map(e =>
            e.method === method ? { ...e, dueDate } : e
        ))
    }

    const handleConfirmPayment = async () => {
        if (!saleId) { setError("No hay venta activa"); return }
        if (remaining !== 0) { setError("Los montos no cubren el total"); return }
        if (cashEntry && cashReceivedNum < cashAmount) { setError("El efectivo recibido es insuficiente"); return }
        if (paymentEntries.some(e => e.method === 'CREDIT' && !e.dueDate)) { setError("Selecciona fecha de vencimiento para el crédito"); return }

        setLoading(true)
        setError(null)

        try {
            const payments = paymentEntries.map(entry => {
                const base: any = { method: entry.method, amount: entry.amount }
                if (entry.method === 'CREDIT') base.dueDate = new Date(entry.dueDate!).toISOString()
                return base
            })

            if (paymentEntries.some(e => e.method === 'CARD')) {
                await new Promise(resolve => setTimeout(resolve, 2000))
            }

            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/api/sales/${saleId}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ payments, cashRegisterId: registerId })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data?.message || JSON.stringify(data))

            if (data.invoice) {
                setInvoiceInfo({ status: data.invoice.status, number: data.invoice.invoiceNumber, url: data.invoice.invoiceUrl })
            }

            setSaleChange(change)
            setSuccess(true)
            setShowPrintPrompt(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const [printError, setPrintError] = useState<string | null>(null)
    const [printing, setPrinting] = useState(false)

    const handlePrintTicket = useCallback(() => {
        setPrintError(null)
        setPrinting(true)
        try {
            printTicket(
                items,
                customerName,
                total,
                saleChange,
                paymentEntries.map(e => ({ method: e.method, amount: e.amount }))
            )
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 500)
        } catch (err: any) {
            setPrintError(err.message || 'Error al imprimir')
            setPrinting(false)
        }
    }, [items, customerName, total, saleChange, paymentEntries, onSuccess, onClose])

    const handlePrintInvoice = () => {
        if (invoiceInfo?.url) {
            window.open(invoiceInfo.url, '_blank')
        } else {
            alert(`Factura ${invoiceInfo?.number ?? 'pendiente'} — Estado: ${invoiceInfo?.status ?? 'procesando'}`)
        }
        onSuccess()
        onClose()
    }

    const handleSkipPrint = () => {
        onSuccess()
        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (paymentEntries.length > 0) { setPaymentEntries([]); setCashReceived('') }
            else onClose()
        }
        if (e.key === 'Enter') {
            if (paymentEntries.length > 0 && remaining === 0 && !cashShort) {
                handleConfirmPayment()
            }
        }
        if (!loading && !success) {
            if (e.key === '1') toggleMethod('CASH')
            if (e.key === '2') toggleMethod('CARD')
            if (e.key === '3') toggleMethod('QR')
            if (e.key === '4') toggleMethod('CREDIT')
        }
    }

    const entryFor = (method: PaymentMethod) => paymentEntries.find(e => e.method === method)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-full sm:max-w-2xl lg:max-w-5xl h-[95vh] sm:h-[90vh] p-0 border-none bg-background-light dark:bg-background-dark font-display overflow-hidden rounded-none sm:rounded-3xl">
                <div className="flex flex-col h-full bg-slate-950 text-white" onKeyDown={handleKeyDown}>
                    {/* Header */}
                    <div className="px-10 py-8 bg-gradient-to-br from-slate-900 to-slate-950 border-b border-slate-800 flex justify-between items-end relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <span className="material-symbols-outlined text-[120px] rotate-12">payments</span>
                        </div>

                        <div className="flex flex-col gap-3 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-2xl font-bold">point_of_sale</span>
                                </div>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase">Finalizar Venta</h2>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 w-fit">
                                <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-300">{customerName || "Consumidor Final"}</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end relative z-10">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Total a Recibir</span>
                            <div className="text-7xl font-black italic tracking-tighter text-emerald-400 drop-shadow-2xl">
                                {formatMoney(total)}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-white dark:bg-slate-900 min-h-0">
                        {/* Sidebar: Payment Methods */}
                        <div className="w-full sm:w-56 lg:w-72 bg-slate-50 dark:bg-slate-950/50 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-row sm:flex-col gap-2 sm:gap-3 overflow-x-auto sm:overflow-x-visible shrink-0">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 px-2 shrink-0">
                                <span className="sm:hidden">Presiona 1-4 · </span>Método de Pago
                            </h3>

                            {METHODS.map(({ method, icon, label, subtitle, key }) => {
                                const entry = entryFor(method)
                                const c = METHOD_COLORS[method]
                                const selected = !!entry
                                const disabled = isDisabled(method)
                                return (
                                    <button key={method} onClick={() => toggleMethod(method)} disabled={disabled}
                                        className={`flex flex-col gap-2 p-4 lg:p-5 rounded-2xl transition-all duration-200 text-left border-2 shrink-0 min-w-[130px] sm:min-w-0 ${selected ? `${c.bg} ${c.border} ${c.shadow} text-white scale-[1.02]` : `bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 ${c.hover}`} ${disabled ? c.disabled : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`material-symbols-outlined text-2xl ${selected ? 'text-white' : c.text}`}>{icon}</span>
                                            {selected && <span className="material-symbols-outlined text-sm text-white/80">check_circle</span>}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-black uppercase tracking-widest">{label}</span>
                                            <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">{subtitle}</span>
                                            {selected && entry && (
                                                <span className="text-xs font-black mt-1">{formatMoney(entry.amount)}</span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Main Payment Area */}
                        <div className="flex-1 p-6 lg:p-8 flex flex-col relative bg-white dark:bg-slate-900 overflow-y-auto">
                            {/* Loading */}
                            {loading && (
                                <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <div className="relative">
                                        <div className="size-28 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-primary animate-spin"></div>
                                        <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl text-primary animate-pulse">lock</span>
                                    </div>
                                    <h3 className="mt-6 text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Procesando Pago...</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 px-12 text-center">Espere un momento mientras confirmamos la transacción</p>
                                </div>
                            )}

                            {/* Success */}
                            {success && showPrintPrompt && (
                                <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center animate-in zoom-in duration-300 p-8">
                                    {saleChange > 0 && (
                                        <div className="mb-6 px-8 py-3 bg-emerald-500/20 border border-emerald-500/40 rounded-full">
                                            <span className="text-emerald-400 font-black text-sm uppercase tracking-widest">
                                                Vuelto: ₲ {saleChange.toLocaleString('es-PY')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="size-24 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30">
                                        <span className="material-symbols-outlined text-5xl text-white">check</span>
                                    </div>
                                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2">¡Venta Exitosa!</h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">
                                        {customerId ? 'Factura electrónica generada' : 'Venta registrada'}
                                    </p>

                                    <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4">
                                        <p className="text-center text-sm font-black uppercase tracking-widest text-slate-300">
                                            ¿Desea imprimir el comprobante?
                                        </p>

                                        {printing && (
                                            <div className="flex items-center justify-center gap-3 py-4">
                                                <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
                                                <span className="text-sm font-black uppercase tracking-widest text-slate-300">Imprimiendo...</span>
                                            </div>
                                        )}

                                        {printError && (
                                            <div className="px-4 py-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-center">
                                                <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-1">Error de impresión</p>
                                                <p className="text-xs text-rose-300/80 font-bold">{printError}</p>
                                                <p className="text-[10px] text-rose-400/60 mt-2">Asegúrate de usar Chrome/Edge con HTTPS o localhost</p>
                                            </div>
                                        )}

                                        {customerId ? (
                                            <div className="space-y-3">
                                                <button onClick={handlePrintInvoice}
                                                    className="w-full flex items-center gap-4 px-6 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-primary/20">
                                                    <span className="material-symbols-outlined text-xl">receipt_long</span>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black">Imprimir Factura</p>
                                                        <p className="text-[10px] opacity-70 font-bold">e-Kuatia / SIFEN</p>
                                                    </div>
                                                </button>
                                                <button onClick={handlePrintTicket} disabled={printing}
                                                    className="w-full flex items-center gap-4 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <span className="material-symbols-outlined text-xl">receipt</span>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black">Solo Ticket</p>
                                                        <p className="text-[10px] opacity-70 font-bold">Comprobante simple</p>
                                                    </div>
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={handlePrintTicket} disabled={printing}
                                                className="w-full flex items-center gap-4 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                                <span className="material-symbols-outlined text-xl">print</span>
                                                <div className="text-left">
                                                    <p className="text-sm font-black">Imprimir Ticket</p>
                                                    <p className="text-[10px] opacity-70 font-bold">Comprobante simple</p>
                                                </div>
                                            </button>
                                        )}
                                        <button onClick={handleSkipPrint}
                                            className="w-full py-3 text-slate-500 hover:text-slate-300 font-black uppercase tracking-widest text-xs transition-colors">
                                            No imprimir — Continuar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* No method selected → Summary + prompt */}
                            {paymentEntries.length === 0 && !success && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-6 text-slate-200 dark:text-slate-800">
                                    {/* Items Summary */}
                                    {items.length > 0 && (
                                        <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Resumen de Venta</h4>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {items.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="text-xs font-black text-slate-400 shrink-0">{item.quantity}x</span>
                                                            <span className="text-slate-700 dark:text-slate-300 truncate font-semibold">{item.name}</span>
                                                        </div>
                                                        <span className="text-slate-900 dark:text-white font-black shrink-0 ml-4">{formatMoney(item.subtotal)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total</span>
                                                <span className="text-lg font-black italic text-slate-900 dark:text-white">{formatMoney(total)}</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center">
                                        <span className="material-symbols-outlined text-[120px]">point_of_sale</span>
                                        <p className="text-xl font-black italic uppercase tracking-tighter text-slate-300 dark:text-slate-700 -mt-6">
                                            Seleccione Método
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-600 mt-2 font-bold uppercase tracking-widest">
                                            Presione <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">1</kbd> Efectivo
                                            · <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">2</kbd> Tarjeta
                                            · <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">3</kbd> QR
                                            · <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">4</kbd> Crédito
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Methods selected → payment forms */}
                            {paymentEntries.length > 0 && !success && (
                                <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
                                    {/* Summary bar */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Medios de Pago</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asignado</span>
                                            <span className={`text-xl font-black italic ${remaining === 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {formatMoney(allocated)} / {formatMoney(total)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${remaining === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${total > 0 ? (allocated / total) * 100 : 0}%` }} />
                                    </div>

                                    {/* Payment entries */}
                                    <div className="flex-1 space-y-4 overflow-y-auto">
                                        {paymentEntries.map((entry) => {
                                            const c = METHOD_COLORS[entry.method]
                                            const m = METHODS.find(m => m.method === entry.method)
                                            return (
                                                <div key={entry.method} className="bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`material-symbols-outlined text-xl ${c.text}`}>{m?.icon}</span>
                                                            <span className="text-sm font-black uppercase tracking-wider">{m?.label}</span>
                                                        </div>
                                                        <button onClick={() => toggleMethod(entry.method)}
                                                            className="text-slate-400 hover:text-rose-400 transition-colors p-1">
                                                            <span className="material-symbols-outlined text-lg">close</span>
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</Label>
                                                            <input type="number"
                                                                value={entry.amount}
                                                                onChange={(e) => updateAmount(entry.method, parseFloat(e.target.value) || 0)}
                                                                className="mt-1 w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-0 transition-all" />
                                                        </div>

                                                        {entry.method === 'CREDIT' && (
                                                            <div>
                                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</Label>
                                                                <input type="date"
                                                                    value={entry.dueDate ?? ''}
                                                                    onChange={(e) => updateDueDate(entry.method, e.target.value)}
                                                                    className="mt-1 w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white focus:border-orange-500 focus:ring-0 transition-all" />
                                                            </div>
                                                        )}

                                                        {entry.method === 'CASH' && (
                                                            <div>
                                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recibido</Label>
                                                                <input ref={cashInputRef} type="number"
                                                                    value={cashReceived}
                                                                    onChange={(e) => setCashReceived(e.target.value)}
                                                                    className="mt-1 w-full h-12 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-0 transition-all" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Quick amounts for cash */}
                                                    {entry.method === 'CASH' && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {QUICK_AMOUNTS.map(amt => (
                                                                <button key={amt} type="button" onClick={() => setCashReceived(String(amt + (cashAmount > 0 ? 0 : 0)))}
                                                                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs font-black transition-colors">
                                                                    {formatMoney(amt)}
                                                                </button>
                                                            ))}
                                                            <button type="button" onClick={() => setCashReceived(String(entry.amount))}
                                                                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg text-xs font-black transition-colors">
                                                                Exacto
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Change display for cash */}
                                                    {entry.method === 'CASH' && cashReceivedNum > 0 && (
                                                        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${cashReceivedNum >= cashAmount ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-600'}`}>
                                                            <span className="text-xs font-black uppercase tracking-widest">
                                                                {cashReceivedNum >= cashAmount ? 'Vuelto' : 'Faltante'}
                                                            </span>
                                                            <span className="text-lg font-black italic">{formatMoney(Math.abs(cashReceivedNum - cashAmount))}</span>
                                                        </div>
                                                    )}

                                                    {/* Card / QR - just info */}
                                                    {(entry.method === 'CARD' || entry.method === 'QR') && (
                                                        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex items-center gap-3">
                                                            <span className="material-symbols-outlined text-slate-400">info</span>
                                                            <span className="text-xs text-slate-500 font-bold">Se cobrarán <span className="text-slate-900 dark:text-white font-black">{formatMoney(entry.amount)}</span> por este medio</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Confirm button */}
                                    <div className="shrink-0">
                                        <Button onClick={handleConfirmPayment}
                                            disabled={remaining !== 0 || (cashEntry ? cashReceivedNum < cashAmount : false) || paymentEntries.some(e => e.method === 'CREDIT' && !e.dueDate)}
                                            className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-2xl shadow-emerald-500/30 transform active:scale-95 transition-all flex items-center justify-center gap-4">
                                            <span className="material-symbols-outlined text-3xl font-black">check</span>
                                            {remaining === 0 ? 'Confirmar Cobro' : `Falta ${formatMoney(remaining)}`}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <Alert variant="destructive" className="mt-4 bg-rose-500 border-none text-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 shrink-0">
                                    <div className="flex gap-4 items-center">
                                        <span className="material-symbols-outlined font-black">error</span>
                                        <div className="flex flex-col">
                                            <AlertTitle className="text-xs font-black uppercase tracking-widest">Error al Procesar</AlertTitle>
                                            <AlertDescription className="text-sm font-bold opacity-90">{error}</AlertDescription>
                                        </div>
                                    </div>
                                </Alert>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
