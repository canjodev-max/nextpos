"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { API_URL } from "@/lib/api"

type Tenant = {
    id: string
    name: string
    slug: string
    email: string | null
    phone: string | null
    plan: string
    isActive: boolean
    createdAt: string
    userCount: number
    productCount: number
    salesCount: number
    totalRevenue: number
}

type Stats = {
    totalTenants: number
    activeTenants: number
    totalUsers: number
    totalSales: number
    totalRevenue: number
    recentTenants: Tenant[]
}

type TenantUser = {
    id: string
    name: string
    email: string
    roleId: string
    roleName: string
    isActive: boolean
    tenantId: string
    tenantName: string | null
    lastLoginAt: string | null
    createdAt: string
}

type Role = {
    id: string
    name: string
    permissions: string[]
}

const PLANS = ["FREE", "PRO", "ENTERPRISE"]

const planColor: Record<string, string> = {
    FREE: "bg-slate-700 text-slate-300",
    PRO: "bg-blue-900 text-blue-300",
    ENTERPRISE: "bg-purple-900 text-purple-300",
}

const fmt = (n: number) =>
    new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n)

export default function SuperAdminPage() {
    const [tab, setTab] = useState<"negocios" | "usuarios">("negocios")
    const [stats, setStats] = useState<Stats | null>(null)
    const [tenants, setTenants] = useState<Tenant[]>([])
    const [users, setUsers] = useState<TenantUser[]>([])
    const [roles, setRoles] = useState<Role[]>([])
    const [loading, setLoading] = useState(true)
    const [showTenantModal, setShowTenantModal] = useState(false)
    const [editTenant, setEditTenant] = useState<Tenant | null>(null)
    const [showUserModal, setShowUserModal] = useState(false)
    const [editUser, setEditUser] = useState<TenantUser | null>(null)
    const [search, setSearch] = useState("")
    const [userSearch, setUserSearch] = useState("")
    const [tenantFilter, setTenantFilter] = useState("")
    const [notifForm, setNotifForm] = useState({ tenantId: "", type: "INFO", title: "", message: "" })
    const [sendingNotif, setSendingNotif] = useState(false)

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [statsRes, tenantsRes, usersRes, rolesRes] = await Promise.all([
                fetch(`${API_URL}/api/tenants/stats`, { headers }),
                fetch(`${API_URL}/api/tenants`, { headers }),
                fetch(`${API_URL}/api/users/all`, { headers }),
                fetch(`${API_URL}/api/roles`, { headers }),
            ])
            if (statsRes.ok) setStats(await statsRes.json())
            if (tenantsRes.ok) setTenants(await tenantsRes.json())
            if (usersRes.ok) setUsers(await usersRes.json())
            if (rolesRes.ok) setRoles(await rolesRes.json())
        } catch {
            toast.error("Error al cargar datos")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const handleDisable = async (id: string, isActive: boolean) => {
        if (!confirm(`¿${isActive ? "Desactivar" : "Activar"} este negocio?`)) return
        if (isActive) {
            const res = await fetch(`${API_URL}/api/tenants/${id}`, { method: "DELETE", headers })
            if (res.ok) {
                toast.success("Negocio desactivado")
                fetchAll()
            } else {
                toast.error("Error al desactivar")
            }
        } else {
            const t = tenants.find(x => x.id === id)
            if (!t) return toast.error("Negocio no encontrado")
            const res = await fetch(`${API_URL}/api/tenants/${id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    name: t.name, slug: t.slug, plan: t.plan, isActive: true,
                    email: t.email, phone: t.phone,
                }),
            })
            if (res.ok) {
                toast.success("Negocio activado")
                fetchAll()
            } else {
                toast.error("Error al activar")
            }
        }
    }

    const handleToggleUserStatus = async (user: TenantUser) => {
        const action = user.isActive ? "desactivar" : "activar"
        if (!confirm(`¿${action} al usuario "${user.name}"?`)) return
        const res = await fetch(`${API_URL}/api/users/super/${user.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
                name: user.name,
                email: user.email,
                roleId: user.roleId,
                isActive: !user.isActive,
            }),
        })
        if (res.ok) {
            toast.success(`Usuario ${user.isActive ? "desactivado" : "activado"}`)
            fetchAll()
        } else {
            const err = await res.json()
            toast.error(err.message || "Error al actualizar usuario")
        }
    }

    const handleSendNotification = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!notifForm.title || !notifForm.message) return
        setSendingNotif(true)
        try {
            const res = await fetch(`${API_URL}/api/notifications`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    tenantId: notifForm.tenantId || null,
                    type: notifForm.type,
                    title: notifForm.title,
                    message: notifForm.message,
                })
            })
            if (res.ok) {
                toast.success("Notificación enviada")
                setNotifForm({ tenantId: "", type: "INFO", title: "", message: "" })
            } else {
                toast.error("Error al enviar")
            }
        } catch {
            toast.error("Error de conexión")
        } finally {
            setSendingNotif(false)
        }
    }

    const filteredTenants = tenants.filter(
        (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.slug.toLowerCase().includes(search.toLowerCase()) ||
            (t.email ?? "").toLowerCase().includes(search.toLowerCase())
    )

    const filteredUsers = users.filter((u) => {
        const matchSearch =
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase())
        const matchTenant = !tenantFilter || u.tenantId === tenantFilter
        return matchSearch && matchTenant
    })

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight italic">Panel Superadmin</h1>
                    <p className="text-slate-400 text-sm mt-1">Gestión global del sistema</p>
                </div>
                {tab === "negocios" && (
                    <button
                        onClick={() => { setEditTenant(null); setShowTenantModal(true) }}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">add_business</span>
                        Nuevo Negocio
                    </button>
                )}
                {tab === "usuarios" && (
                    <button
                        onClick={() => { setEditUser(null); setShowUserModal(true) }}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-violet-600/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Nuevo Usuario
                    </button>
                )}
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { label: "Negocios Totales", value: stats.totalTenants, icon: "storefront", color: "text-blue-400" },
                        { label: "Negocios Activos", value: stats.activeTenants, icon: "check_circle", color: "text-emerald-400" },
                        { label: "Usuarios Totales", value: stats.totalUsers, icon: "group", color: "text-violet-400" },
                        { label: "Ventas Totales", value: stats.totalSales, icon: "receipt_long", color: "text-amber-400" },
                        { label: "Ingresos Globales", value: fmt(stats.totalRevenue), icon: "payments", color: "text-rose-400" },
                    ].map((s) => (
                        <div key={s.label} className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                            <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
                            <p className="text-2xl font-black text-white mt-2">{s.value}</p>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700 w-fit">
                {([
                    { id: "negocios" as const, label: "Negocios", icon: "storefront" },
                    { id: "usuarios" as const, label: "Usuarios", icon: "group" },
                ]).map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${tab === t.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-white"}`}>
                        <span className="material-symbols-outlined text-lg">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* NEGOCIOS TAB */}
            {/* ═══════════════════════════════════════ */}
            {tab === "negocios" && (
                <>
                    {/* Send Notification */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <span className="material-symbols-outlined text-violet-400 text-2xl">send</span>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Enviar Notificación</h2>
                                <p className="text-xs text-slate-400">Envía mensajes a uno o todos los negocios</p>
                            </div>
                        </div>
                        <form onSubmit={handleSendNotification} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destinatario</label>
                                <select value={notifForm.tenantId} onChange={e => setNotifForm(f => ({ ...f, tenantId: e.target.value }))}
                                    className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                    <option value="">📢 Todos los negocios (broadcast)</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                                <select value={notifForm.type} onChange={e => setNotifForm(f => ({ ...f, type: e.target.value }))}
                                    className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                    <option value="INFO">ℹ️ Información</option>
                                    <option value="WARNING">⚠️ Advertencia</option>
                                    <option value="DANGER">🚨 Urgente</option>
                                    <option value="PAYMENT">💳 Pago / Facturación</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Título *</label>
                                <input required value={notifForm.title} onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Ej: Pago pendiente"
                                    className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mensaje *</label>
                                <input required value={notifForm.message} onChange={e => setNotifForm(f => ({ ...f, message: e.target.value }))}
                                    placeholder="Ej: Su plan vence en 3 días..."
                                    className="mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                                <button type="submit" disabled={sendingNotif}
                                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-violet-600/20 transition-all active:scale-95 disabled:opacity-50">
                                    <span className="material-symbols-outlined text-lg">send</span>
                                    {sendingNotif ? "Enviando..." : "Enviar"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-sm">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar negocio..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>

                    {/* Table */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-widest">
                                    <th className="text-left px-6 py-4">Negocio</th>
                                    <th className="text-left px-4 py-4">Plan</th>
                                    <th className="text-right px-4 py-4">Usuarios</th>
                                    <th className="text-right px-4 py-4">Productos</th>
                                    <th className="text-right px-4 py-4">Ventas</th>
                                    <th className="text-right px-4 py-4">Ingresos</th>
                                    <th className="text-center px-4 py-4">Estado</th>
                                    <th className="text-right px-6 py-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} className="text-center py-12 text-slate-500">Cargando...</td></tr>
                                ) : filteredTenants.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-12 text-slate-500">No hay negocios</td></tr>
                                ) : filteredTenants.map((t) => (
                                    <tr key={t.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-white">{t.name}</p>
                                            <p className="text-xs text-slate-500">/{t.slug}</p>
                                            {t.email && <p className="text-xs text-slate-500">{t.email}</p>}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs font-black px-2 py-1 rounded-full uppercase ${planColor[t.plan] ?? "bg-slate-700 text-slate-300"}`}>{t.plan}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right text-slate-300">{t.userCount}</td>
                                        <td className="px-4 py-4 text-right text-slate-300">{t.productCount}</td>
                                        <td className="px-4 py-4 text-right text-slate-300">{t.salesCount}</td>
                                        <td className="px-4 py-4 text-right text-slate-300">{fmt(t.totalRevenue)}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`text-xs font-black px-2 py-1 rounded-full uppercase ${t.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                                                {t.isActive ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => { setEditTenant(t); setShowTenantModal(true) }}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors" title="Editar">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button onClick={() => handleDisable(t.id, t.isActive)}
                                                    className={`p-1.5 rounded-lg transition-colors ${t.isActive ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/30"}`}
                                                    title={t.isActive ? "Desactivar" : "Activar"}>
                                                    <span className="material-symbols-outlined text-lg">{t.isActive ? "block" : "check_circle"}</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {showTenantModal && (
                        <TenantModal tenant={editTenant} headers={headers} roles={roles}
                            onClose={() => setShowTenantModal(false)}
                            onSuccess={() => { setShowTenantModal(false); fetchAll() }} />
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* USUARIOS TAB */}
            {/* ═══════════════════════════════════════ */}
            {tab === "usuarios" && (
                <>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                                placeholder="Buscar usuario..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                            <option value="">Todos los negocios</option>
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Users Table */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-widest">
                                    <th className="text-left px-6 py-4">Usuario</th>
                                    <th className="text-left px-4 py-4">Rol</th>
                                    <th className="text-left px-4 py-4">Negocio</th>
                                    <th className="text-center px-4 py-4">Estado</th>
                                    <th className="text-left px-4 py-4">Último Acceso</th>
                                    <th className="text-right px-6 py-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-500">Cargando...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-500">No hay usuarios</td></tr>
                                ) : filteredUsers.map((u) => (
                                    <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-white">{u.name}</p>
                                            <p className="text-xs text-slate-500">{u.email}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-black px-2 py-1 rounded-full uppercase bg-slate-700 text-slate-300">
                                                {u.roleName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-300">{u.tenantName ?? "—"}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`text-xs font-black px-2 py-1 rounded-full uppercase ${u.isActive ? "bg-emerald-900 text-emerald-300" : "bg-red-900 text-red-300"}`}>
                                                {u.isActive ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-400 text-xs">
                                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Nunca"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => { setEditUser(u); setShowUserModal(true) }}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors" title="Editar">
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button onClick={() => handleToggleUserStatus(u)}
                                                    className={`p-1.5 rounded-lg transition-colors ${u.isActive ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/30"}`}
                                                    title={u.isActive ? "Desactivar" : "Activar"}>
                                                    <span className="material-symbols-outlined text-lg">{u.isActive ? "block" : "check_circle"}</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {showUserModal && (
                        <UserModal user={editUser} headers={headers} roles={roles} tenants={tenants}
                            onClose={() => setShowUserModal(false)}
                            onSuccess={() => { setShowUserModal(false); fetchAll() }} />
                    )}
                </>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TENANT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

type TenantFull = Tenant & {
    ruc?: string
    razonSocial?: string
    nombreFantasia?: string
    actividadEconomicaCodigo?: string
    actividadEconomicaDescripcion?: string
    tipoContribuyente?: number
    tipoRegimen?: number
    timbradoNumero?: string
    timbradoFecha?: string
    codigoEstablecimiento?: string
    puntoExpedicion?: string
    direccionEstablecimiento?: string
    departamento?: number
    departamentoDescripcion?: string
    distrito?: number
    distritoDescripcion?: string
    ciudad?: number
    ciudadDescripcion?: string
    telefonoEstablecimiento?: string
    emailEstablecimiento?: string
    denominacionEstablecimiento?: string
    csc?: string
    cscId?: string
    sifenHabilitado?: boolean
    sifenAmbiente?: string
}

function TenantModal({
    tenant, headers, roles, onClose, onSuccess,
}: {
    tenant: Tenant | null
    headers: Record<string, string>
    roles: Role[]
    onClose: () => void
    onSuccess: () => void
}) {
    const isEdit = !!tenant
    const [loading, setLoading] = useState(false)
    const [tab, setTab] = useState<"negocio" | "sifen" | "admin">("negocio")
    const t = tenant as TenantFull | null
    const [form, setForm] = useState({
        name: t?.name ?? "",
        slug: t?.slug ?? "",
        email: t?.email ?? "",
        phone: t?.phone ?? "",
        address: "",
        plan: t?.plan ?? "FREE",
        isActive: t?.isActive ?? true,
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        ruc: t?.ruc ?? "",
        razonSocial: t?.razonSocial ?? "",
        nombreFantasia: t?.nombreFantasia ?? "",
        actividadEconomicaCodigo: t?.actividadEconomicaCodigo ?? "",
        actividadEconomicaDescripcion: t?.actividadEconomicaDescripcion ?? "",
        tipoContribuyente: String(t?.tipoContribuyente ?? "2"),
        tipoRegimen: String(t?.tipoRegimen ?? "8"),
        timbradoNumero: t?.timbradoNumero ?? "",
        timbradoFecha: t?.timbradoFecha?.slice(0, 10) ?? "",
        codigoEstablecimiento: t?.codigoEstablecimiento ?? "001",
        puntoExpedicion: t?.puntoExpedicion ?? "001",
        direccionEstablecimiento: t?.direccionEstablecimiento ?? "",
        departamento: String(t?.departamento ?? "11"),
        departamentoDescripcion: t?.departamentoDescripcion ?? "",
        distrito: String(t?.distrito ?? "145"),
        distritoDescripcion: t?.distritoDescripcion ?? "",
        ciudad: String(t?.ciudad ?? "3432"),
        ciudadDescripcion: t?.ciudadDescripcion ?? "",
        telefonoEstablecimiento: t?.telefonoEstablecimiento ?? "",
        emailEstablecimiento: t?.emailEstablecimiento ?? "",
        denominacionEstablecimiento: t?.denominacionEstablecimiento ?? "",
        csc: t?.csc ?? "",
        cscId: t?.cscId ?? "",
        sifenHabilitado: t?.sifenHabilitado ?? false,
        sifenAmbiente: t?.sifenAmbiente ?? "test",
    })

    const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

    const sifenFields = () => ({
        ruc: form.ruc || null,
        razonSocial: form.razonSocial || null,
        nombreFantasia: form.nombreFantasia || null,
        actividadEconomicaCodigo: form.actividadEconomicaCodigo || null,
        actividadEconomicaDescripcion: form.actividadEconomicaDescripcion || null,
        tipoContribuyente: parseInt(form.tipoContribuyente),
        tipoRegimen: parseInt(form.tipoRegimen),
        timbradoNumero: form.timbradoNumero || null,
        timbradoFecha: form.timbradoFecha || null,
        codigoEstablecimiento: form.codigoEstablecimiento || "001",
        puntoExpedicion: form.puntoExpedicion || "001",
        direccionEstablecimiento: form.direccionEstablecimiento || null,
        departamento: parseInt(form.departamento),
        departamentoDescripcion: form.departamentoDescripcion || null,
        distrito: parseInt(form.distrito),
        distritoDescripcion: form.distritoDescripcion || null,
        ciudad: parseInt(form.ciudad),
        ciudadDescripcion: form.ciudadDescripcion || null,
        telefonoEstablecimiento: form.telefonoEstablecimiento || null,
        emailEstablecimiento: form.emailEstablecimiento || null,
        denominacionEstablecimiento: form.denominacionEstablecimiento || null,
        csc: form.csc || null,
        cscId: form.cscId || null,
        sifenHabilitado: form.sifenHabilitado,
        sifenAmbiente: form.sifenAmbiente,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const url = isEdit ? `${API_URL}/api/tenants/${tenant!.id}` : `${API_URL}/api/tenants`
            const method = isEdit ? "PUT" : "POST"
            const body = isEdit
                ? { name: form.name, slug: form.slug, email: form.email, phone: form.phone, address: form.address, plan: form.plan, isActive: form.isActive, ...sifenFields() }
                : { name: form.name, slug: form.slug, email: form.email, phone: form.phone, address: form.address, plan: form.plan, adminName: form.adminName, adminEmail: form.adminEmail, adminPassword: form.adminPassword, ...sifenFields() }

            const res = await fetch(url, { method, headers, body: JSON.stringify(body) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message ?? "Error")
            toast.success(isEdit ? "Negocio actualizado" : "Negocio creado")
            onSuccess()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        } finally {
            setLoading(false)
        }
    }

    const inputCls = "mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    const labelCls = "text-xs font-bold text-slate-400 uppercase tracking-wider"

    const tabs = [
        { id: "negocio" as const, label: "Negocio", icon: "store" },
        { id: "sifen" as const, label: "e-Kuatia / SIFEN", icon: "receipt_long" },
        ...(!isEdit ? [{ id: "admin" as const, label: "Administrador", icon: "manage_accounts" }] : []),
    ]

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight italic">
                        {isEdit ? "Editar Negocio" : "Nuevo Negocio"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex border-b border-slate-700 shrink-0">
                    {tabs.map(tb => (
                        <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
                            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${tab === tb.id ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
                            <span className="material-symbols-outlined text-base">{tb.icon}</span>
                            {tb.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1 p-6">
                        {tab === "negocio" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className={labelCls}>Nombre del Negocio *</label>
                                    <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Ej: Supermercado Don Juan" />
                                </div>
                                <div>
                                    <label className={labelCls}>Slug *</label>
                                    <input required value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} className={inputCls} placeholder="supermercado-don-juan" />
                                </div>
                                <div>
                                    <label className={labelCls}>Plan</label>
                                    <select value={form.plan} onChange={(e) => set("plan", e.target.value)} className={inputCls}>
                                        {PLANS.map((p) => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Email de contacto</label>
                                    <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="contacto@negocio.com" />
                                </div>
                                <div>
                                    <label className={labelCls}>Teléfono</label>
                                    <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="0981-000000" />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelCls}>Dirección</label>
                                    <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} placeholder="Av. Principal 123" />
                                </div>
                                {isEdit && (
                                    <div className="col-span-2 flex items-center gap-3">
                                        <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 accent-primary" />
                                        <label htmlFor="isActive" className="text-sm text-slate-300">Negocio activo</label>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === "sifen" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3 border border-slate-600">
                                    <div>
                                        <p className="text-sm font-black text-white">Facturación Electrónica (e-Kuatia)</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Habilitar integración con SIFEN — SET Paraguay</p>
                                    </div>
                                    <button type="button" onClick={() => set("sifenHabilitado", !form.sifenHabilitado)}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${form.sifenHabilitado ? "bg-primary" : "bg-slate-600"}`}>
                                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.sifenHabilitado ? "translate-x-7" : "translate-x-1"}`} />
                                    </button>
                                </div>
                                <div>
                                    <label className={labelCls}>Ambiente SIFEN</label>
                                    <div className="flex gap-3 mt-1">
                                        {(["test", "prod"] as const).map(a => (
                                            <button key={a} type="button" onClick={() => set("sifenAmbiente", a)}
                                                className={`flex-1 py-2 rounded-lg text-sm font-black uppercase tracking-widest border transition-colors ${form.sifenAmbiente === a ? (a === "prod" ? "bg-emerald-600 border-emerald-500 text-white" : "bg-amber-600 border-amber-500 text-white") : "bg-slate-700 border-slate-600 text-slate-400 hover:text-white"}`}>
                                                {a === "test" ? "🧪 Pruebas" : "🚀 Producción"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">badge</span>Datos del Contribuyente
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelCls}>RUC</label><input value={form.ruc} onChange={(e) => set("ruc", e.target.value)} className={inputCls} placeholder="80069563-1" /></div>
                                        <div>
                                            <label className={labelCls}>Tipo Contribuyente</label>
                                            <select value={form.tipoContribuyente} onChange={(e) => set("tipoContribuyente", e.target.value)} className={inputCls}>
                                                <option value="1">1 — Persona Física</option>
                                                <option value="2">2 — Persona Jurídica</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2"><label className={labelCls}>Razón Social</label><input value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} className={inputCls} placeholder="EMPRESA S.A." /></div>
                                        <div className="col-span-2"><label className={labelCls}>Nombre de Fantasía</label><input value={form.nombreFantasia} onChange={(e) => set("nombreFantasia", e.target.value)} className={inputCls} placeholder="Nombre comercial" /></div>
                                        <div><label className={labelCls}>Cód. Actividad Económica</label><input value={form.actividadEconomicaCodigo} onChange={(e) => set("actividadEconomicaCodigo", e.target.value)} className={inputCls} placeholder="4690" /></div>
                                        <div><label className={labelCls}>Descripción</label><input value={form.actividadEconomicaDescripcion} onChange={(e) => set("actividadEconomicaDescripcion", e.target.value)} className={inputCls} placeholder="Venta al por mayor" /></div>
                                        <div>
                                            <label className={labelCls}>Tipo de Régimen</label>
                                            <select value={form.tipoRegimen} onChange={(e) => set("tipoRegimen", e.target.value)} className={inputCls}>
                                                <option value="1">1 — Régimen Normal</option>
                                                <option value="7">7 — Pequeño Contribuyente</option>
                                                <option value="8">8 — Microempresa</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">approval</span>Timbrado
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelCls}>Número de Timbrado</label><input value={form.timbradoNumero} onChange={(e) => set("timbradoNumero", e.target.value)} className={inputCls} placeholder="12558946" /></div>
                                        <div><label className={labelCls}>Fecha de Inicio</label><input type="date" value={form.timbradoFecha} onChange={(e) => set("timbradoFecha", e.target.value)} className={inputCls} /></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">location_on</span>Establecimiento
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelCls}>Código Establecimiento</label><input value={form.codigoEstablecimiento} onChange={(e) => set("codigoEstablecimiento", e.target.value)} className={inputCls} maxLength={3} /></div>
                                        <div><label className={labelCls}>Punto de Expedición</label><input value={form.puntoExpedicion} onChange={(e) => set("puntoExpedicion", e.target.value)} className={inputCls} maxLength={3} /></div>
                                        <div><label className={labelCls}>Denominación del Local</label><input value={form.denominacionEstablecimiento} onChange={(e) => set("denominacionEstablecimiento", e.target.value)} className={inputCls} /></div>
                                        <div><label className={labelCls}>Teléfono del Local</label><input value={form.telefonoEstablecimiento} onChange={(e) => set("telefonoEstablecimiento", e.target.value)} className={inputCls} /></div>
                                        <div className="col-span-2"><label className={labelCls}>Dirección</label><input value={form.direccionEstablecimiento} onChange={(e) => set("direccionEstablecimiento", e.target.value)} className={inputCls} /></div>
                                        <div><label className={labelCls}>Email del Establecimiento</label><input type="email" value={form.emailEstablecimiento} onChange={(e) => set("emailEstablecimiento", e.target.value)} className={inputCls} /></div>
                                        <div><label className={labelCls}>Departamento</label><input value={form.departamento} onChange={(e) => set("departamento", e.target.value)} className={inputCls} /></div>
                                        <div><label className={labelCls}>Distrito</label><input value={form.distrito} onChange={(e) => set("distrito", e.target.value)} className={inputCls} /></div>
                                        <div><label className={labelCls}>Ciudad</label><input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} className={inputCls} /></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">security</span>Certificado Digital
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelCls}>CSC</label><input value={form.csc} onChange={(e) => set("csc", e.target.value)} className={inputCls} /></div>
                                        <div><label className={labelCls}>ID del CSC</label><input value={form.cscId} onChange={(e) => set("cscId", e.target.value)} className={inputCls} /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === "admin" && !isEdit && (
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400">Se creará un usuario con rol <span className="text-white font-bold">ADMIN</span> para este negocio.</p>
                                <div><label className={labelCls}>Nombre completo *</label><input required value={form.adminName} onChange={(e) => set("adminName", e.target.value)} className={inputCls} placeholder="Juan Pérez" /></div>
                                <div><label className={labelCls}>Email *</label><input required type="email" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} className={inputCls} placeholder="admin@negocio.com" /></div>
                                <div><label className={labelCls}>Contraseña *</label><input required type="password" minLength={6} value={form.adminPassword} onChange={(e) => set("adminPassword", e.target.value)} className={inputCls} /></div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 px-6 py-4 border-t border-slate-700 shrink-0">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Negocio"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  USER MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function UserModal({
    user, headers, roles, tenants, onClose, onSuccess,
}: {
    user: TenantUser | null
    headers: Record<string, string>
    roles: Role[]
    tenants: Tenant[]
    onClose: () => void
    onSuccess: () => void
}) {
    const isEdit = !!user
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        tenantId: user?.tenantId ?? (tenants[0]?.id ?? ""),
        name: user?.name ?? "",
        email: user?.email ?? "",
        password: "",
        roleId: user?.roleId ?? "",
        isActive: user?.isActive ?? true,
    })

    const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.roleId) return toast.error("Selecciona un rol")
        setLoading(true)
        try {
            if (isEdit) {
                const res = await fetch(`${API_URL}/api/users/super/${user!.id}`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({
                        name: form.name,
                        email: form.email,
                        password: form.password || null,
                        roleId: form.roleId,
                        isActive: form.isActive,
                    }),
                })
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.message ?? err.title ?? "Error")
                }
                toast.success("Usuario actualizado")
            } else {
                if (!form.tenantId) return toast.error("Selecciona un negocio")
                if (!form.password || form.password.length < 6) return toast.error("Contraseña mínimo 6 caracteres")
                const res = await fetch(`${API_URL}/api/users/super`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        tenantId: form.tenantId,
                        name: form.name,
                        email: form.email,
                        password: form.password,
                        roleId: form.roleId,
                        isActive: form.isActive,
                    }),
                })
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.message ?? err.title ?? "Error")
                }
                toast.success("Usuario creado")
            }
            onSuccess()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error")
        } finally {
            setLoading(false)
        }
    }

    const inputCls = "mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
    const labelCls = "text-xs font-bold text-slate-400 uppercase tracking-wider"

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight italic">
                        {isEdit ? "Editar Usuario" : "Nuevo Usuario"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!isEdit && (
                        <div>
                            <label className={labelCls}>Negocio *</label>
                            <select required value={form.tenantId} onChange={(e) => set("tenantId", e.target.value)} className={inputCls}>
                                <option value="">Seleccionar negocio...</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={labelCls}>Nombre completo *</label>
                        <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Juan Pérez" />
                    </div>
                    <div>
                        <label className={labelCls}>Email *</label>
                        <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="usuario@correo.com" />
                    </div>
                    <div>
                        <label className={labelCls}>Contraseña {isEdit ? "(dejar vacío para no cambiar)" : "*"}</label>
                        <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
                            className={inputCls} placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"} minLength={isEdit ? 0 : 6} />
                    </div>
                    <div>
                        <label className={labelCls}>Rol *</label>
                        <select required value={form.roleId} onChange={(e) => set("roleId", e.target.value)} className={inputCls}>
                            <option value="">Seleccionar rol...</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    {isEdit && (
                        <div className="flex items-center gap-3 pt-2">
                            <input type="checkbox" id="userIsActive" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 accent-violet-500" />
                            <label htmlFor="userIsActive" className="text-sm text-slate-300">Usuario activo</label>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-bold hover:bg-slate-700 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-violet-600/20 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Usuario"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
