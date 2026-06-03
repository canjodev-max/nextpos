"use client"

import { useState } from "react"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

type BrandingData = {
  id: string
  name: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  darkPrimaryColor: string | null
  darkSecondaryColor: string | null
}

export default function BrandingModal({
  tenant,
  headers,
  onClose,
  onSuccess,
}: {
  tenant: BrandingData
  headers: Record<string, string>
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: tenant.name,
    logoUrl: tenant.logoUrl ?? "",
    primaryColor: tenant.primaryColor ?? "#135bec",
    secondaryColor: tenant.secondaryColor ?? "#6366f1",
    darkPrimaryColor: tenant.darkPrimaryColor ?? "#3b82f6",
    darkSecondaryColor: tenant.darkSecondaryColor ?? "#818cf8",
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        slug: tenant.name.toLowerCase().replace(/\s+/g, "-"),
        plan: "FREE",
        isActive: true,
        logoUrl: form.logoUrl || null,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        darkPrimaryColor: form.darkPrimaryColor,
        darkSecondaryColor: form.darkSecondaryColor,
      }
      const res = await fetch(`${API_URL}/api/tenants/${tenant.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? "Error al guardar")
      }
      toast.success("Branding actualizado")
      onSuccess()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`${API_URL}/api/tenants/${tenant.id}/logo`, {
        method: "POST",
        headers: { Authorization: headers.Authorization },
        body: formData,
      })
      if (!res.ok) throw new Error("Error al subir logo")
      const data = await res.json()
      set("logoUrl", data.logoUrl)
      toast.success("Logo subido correctamente")
    } catch {
      toast.error("Error al subir el logo")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-xl p-0 border-none bg-transparent overflow-hidden rounded-[32px]">
        <div className="bg-white dark:bg-slate-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
              Branding — {tenant.name}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form id="branding-form" onSubmit={handleSubmit}>
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Logo */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Logo del Negocio
                </label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="size-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {form.logoUrl ? (
                      <img src={form.logoUrl} alt="Logo" className="size-full object-contain" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-400">store</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={form.logoUrl}
                      onChange={(e) => set("logoUrl", e.target.value)}
                      placeholder="https://ejemplo.com/logo.png"
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-base">upload</span>
                      Subir archivo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                      {uploading && <span className="text-xs text-slate-400">Subiendo...</span>}
                    </label>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Color Primario
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => set("primaryColor", e.target.value)}
                      className="size-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent shrink-0"
                    />
                    <input
                      value={form.primaryColor}
                      onChange={(e) => set("primaryColor", e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="#135bec"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Botones, enlaces, acentos (modo claro)</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Color Secundario
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) => set("secondaryColor", e.target.value)}
                      className="size-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent shrink-0"
                    />
                    <input
                      value={form.secondaryColor}
                      onChange={(e) => set("secondaryColor", e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="#6366f1"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Elementos secundarios (modo claro)</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Color Primario (Dark)
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={form.darkPrimaryColor}
                      onChange={(e) => set("darkPrimaryColor", e.target.value)}
                      className="size-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent shrink-0"
                    />
                    <input
                      value={form.darkPrimaryColor}
                      onChange={(e) => set("darkPrimaryColor", e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="#3b82f6"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Color primario en modo oscuro</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Color Secundario (Dark)
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={form.darkSecondaryColor}
                      onChange={(e) => set("darkSecondaryColor", e.target.value)}
                      className="size-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent shrink-0"
                    />
                    <input
                      value={form.darkSecondaryColor}
                      onChange={(e) => set("darkSecondaryColor", e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="#818cf8"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Color secundario en modo oscuro</p>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vista Previa</p>
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: form.primaryColor }}
                  >
                    <span className="material-symbols-outlined text-white text-lg">storefront</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{form.name}</p>
                    <p className="text-xs text-slate-500">Botón primario</p>
                  </div>
                  <button
                    type="button"
                    className="ml-auto px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all"
                    style={{
                      backgroundColor: form.primaryColor,
                      boxShadow: `0 4px 14px ${form.primaryColor}33`,
                    }}
                  >
                    Vista Previa
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded"
                    style={{ backgroundColor: `${form.primaryColor}20`, color: form.primaryColor }}
                  >
                    Modo Claro
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded"
                    style={{ backgroundColor: `${form.darkPrimaryColor}20`, color: form.darkPrimaryColor }}
                  >
                    Modo Oscuro
                  </span>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" form="branding-form" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: form.primaryColor,
                boxShadow: `0 4px 14px ${form.primaryColor}33`,
              }}>
              {loading ? "Guardando..." : "Guardar Branding"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
