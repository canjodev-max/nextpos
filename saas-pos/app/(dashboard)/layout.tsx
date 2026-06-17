"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { NotificationsPanel } from "@/components/NotificationsPanel"
import { loadSettings, applyTheme } from "@/lib/settings"

type Branding = {
    tenantName?: string
    tenantLogoUrl?: string
    primaryColor?: string
    secondaryColor?: string
    darkPrimaryColor?: string
    darkSecondaryColor?: string
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [isInventoryOpen, setIsInventoryOpen] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => {
        localStorage.removeItem("user")
        localStorage.removeItem("token")
        router.push("/login")
    }

    const [branding, setBranding] = useState<Branding>(() => {
        if (typeof window !== "undefined") {
            const userStr = localStorage.getItem("user")
            if (userStr) {
                try {
                    const user = JSON.parse(userStr)
                    return {
                        tenantName: user.tenantName || user.name?.split(" ")[0] + "'s Shop",
                        tenantLogoUrl: user.tenantLogoUrl || null,
                        primaryColor: user.primaryColor || "#135bec",
                        secondaryColor: user.secondaryColor || "#6366f1",
                        darkPrimaryColor: user.darkPrimaryColor || "#3b82f6",
                        darkSecondaryColor: user.darkSecondaryColor || "#818cf8",
                    }
                } catch {
                    return {}
                }
            }
        }
        return {}
    })

    const [userRole, setUserRole] = useState<string | null>(() => {
        if (typeof window !== "undefined") {
            const userStr = localStorage.getItem("user")
            if (userStr) {
                try {
                    const user = JSON.parse(userStr)
                    return user.Role || user.role || null
                } catch {
                    return null
                }
            }
        }
        return null
    })
    const [userName, setUserName] = useState<string>(() => {
        if (typeof window !== "undefined") {
            const userStr = localStorage.getItem("user")
            if (userStr) {
                try {
                    const user = JSON.parse(userStr)
                    return user.Name || user.name || "User"
                } catch {
                    return "User"
                }
            }
        }
        return "User"
    })
    const [businessType, setBusinessType] = useState<string>(() => {
        if (typeof window !== "undefined") {
            const userStr = localStorage.getItem("user")
            if (userStr) {
                try {
                    const user = JSON.parse(userStr)
                    return user.businessType || ""
                } catch {
                    return ""
                }
            }
        }
        return ""
    })

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) {
            router.push("/login")
        }
    }, [])

    // Aplicar colores dinámicos del tenant + perfil
    useEffect(() => {
        const root = document.documentElement
        if (branding.primaryColor) root.style.setProperty("--color-primary", branding.primaryColor)
        if (branding.secondaryColor) root.style.setProperty("--color-secondary", branding.secondaryColor)
        if (branding.darkPrimaryColor) root.style.setProperty("--color-dark-primary", branding.darkPrimaryColor)
        if (branding.darkSecondaryColor) root.style.setProperty("--color-dark-secondary", branding.darkSecondaryColor)
        // También aplicar colores guardados desde perfil
        const settings = loadSettings()
        applyTheme(settings)
    }, [branding])

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            {/* Sidebar Navigation */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary rounded-lg p-2 flex items-center justify-center overflow-hidden size-10">
                            {branding.tenantLogoUrl ? (
                                <img src={branding.tenantLogoUrl} alt="Logo" className="size-full object-contain" />
                            ) : (
                                <span className="material-symbols-outlined text-white">storefront</span>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-white text-base font-bold leading-none truncate">{branding.tenantName || "SaaS POS"}</h1>
                            <p className="text-slate-400 text-xs font-medium">Retail Management</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {/* Cajero: solo Caja del Día */}
                    {userRole === "CAJERO" && (
                        <Link
                            href="/cash"
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname === '/cash' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <span className="material-symbols-outlined">payments</span>
                            <span className="text-sm font-bold uppercase tracking-tighter italic">Caja del Día</span>
                        </Link>
                    )}

                    {/* Admin: menú completo */}
                    {userRole === "ADMIN" && (
                        <>
                            {/* Inventory with Dropdown */}
                            <div className="space-y-1">
                                <button
                                    onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined">inventory_2</span>
                                        <span className="text-sm font-bold uppercase tracking-tighter italic">Inventario</span>
                                    </div>
                                    <span className={`material-symbols-outlined text-sm transition-transform ${isInventoryOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                </button>
                                {isInventoryOpen && (
                                    <div className="ml-9 flex flex-col gap-1 border-l border-slate-700 pl-4 py-1">
                                        <Link href="/inventory?tab=stock" className="text-[10px] font-black uppercase tracking-widest py-1 text-slate-500 hover:text-primary transition-colors">Stock General</Link>
                                        <Link href="/inventory?tab=add" className="text-[10px] font-black uppercase tracking-widest py-1 text-slate-500 hover:text-primary transition-colors">Agregar Producto</Link>
                                        <Link href="/inventory?tab=offers" className="text-[10px] font-black uppercase tracking-widest py-1 text-slate-500 hover:text-primary transition-colors">Ofertas</Link>
                                        <Link href="/inventory?tab=categories" className="text-[10px] font-black uppercase tracking-widest py-1 text-slate-500 hover:text-primary transition-colors">Categorías</Link>
                                        <Link href="/inventory?tab=missing" className="text-[10px] font-black uppercase tracking-widest py-1 text-slate-500 hover:text-rose-400 transition-colors">Stock Crítico</Link>
                                        <Link href="/inventory?tab=kardex" className="text-[10px] font-black uppercase tracking-widest py-1 text-slate-500 hover:text-primary transition-colors">Kardex</Link>
                                    </div>
                                )}
                            </div>

                            <Link
                                href="/customers"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname === '/customers' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <span className="material-symbols-outlined">groups</span>
                                <span className="text-sm font-bold uppercase tracking-tighter italic">Clientes</span>
                            </Link>

                            <Link
                                href="/cash"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname === '/cash' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <span className="material-symbols-outlined">payments</span>
                                <span className="text-sm font-bold uppercase tracking-tighter italic">Caja del Día</span>
                            </Link>

                            <Link
                                href="/cash/admin"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname === '/cash/admin' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <span className="material-symbols-outlined">fact_check</span>
                                <span className="text-sm font-bold uppercase tracking-tighter italic">Auditoría</span>
                            </Link>

                            <Link
                                href="/roles"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname === '/roles' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <span className="material-symbols-outlined">shield_person</span>
                                <span className="text-sm font-bold uppercase tracking-tighter italic">Accesos</span>
                            </Link>

                            {businessType === "OPTICA" && (
                                <Link
                                    href="/optica"
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname.startsWith('/optica') ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                >
                                    <span className="material-symbols-outlined">visibility</span>
                                    <span className="text-sm font-bold uppercase tracking-tighter italic">Óptica</span>
                                </Link>
                            )}

                            <div className="pt-4 pb-1 px-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sistema</p>
                            </div>
                            <Link
                                href="/profile"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname === '/profile' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <span className="material-symbols-outlined">settings</span>
                                <span className="text-sm font-bold uppercase tracking-tighter italic">Configuración</span>
                            </Link>
                        </>
                    )}

                    {/* Superadmin: solo su panel */}
                    {userRole === "SUPERADMIN" && (
                        <>
                            <div className="pt-2 pb-1 px-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Superadmin</p>
                            </div>
                            <Link
                                href="/superadmin"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${pathname === '/superadmin' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <span className="material-symbols-outlined">admin_panel_settings</span>
                                <span className="text-sm font-bold uppercase tracking-tighter italic">Negocios</span>
                            </Link>
                        </>
                    )}
                </nav>
                <div className="p-4 border-t border-slate-800 space-y-3">
                    {/* Terminal abre en pestaña nueva */}
                    <a
                        href="/pos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                        <span>Abrir Terminal</span>
                    </a>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-rose-400 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
                {/* Header */}
                <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <div className="flex items-center gap-3 md:gap-6">
                        <button 
                            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <h2 className="text-base md:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                            {pathname === '/pos' ? 'POS Terminal' : 
                             pathname === '/inventory' ? 'Inventory Management' :
                             pathname === '/cash' ? 'Cash Management' : 
                             pathname === '/cash/admin' ? 'Cash Audit' :
                             pathname === '/customers' ? 'Customers' :
                             pathname === '/roles' ? 'Roles & Access' :
                             pathname === '/profile' ? 'Configuración' :
                             pathname === '/superadmin' ? 'Panel Superadmin' :
                             pathname.startsWith('/optica') ? 'Módulo Óptica' : 'Dashboard Overview'}
                        </h2>
                        
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationsPanel />
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                        <Link href="/profile" className="flex items-center gap-3 group">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{userName}</p>
                                <p className="text-xs text-slate-500">{userRole}</p>
                            </div>
                            <div 
                                className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 bg-center bg-no-repeat bg-cover group-hover:ring-2 group-hover:ring-primary transition-all" 
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBeuM1wcosgnu3Xn88Zfvtok6c9-8cswyOAKauGWXRFZ8GCfnAmQI_qGUfQAuIrlzqokL4QhXWm7VwKvwHQ8p_-rQl9hzXVjf6F2PVUhpYWdLRuzafxWonImuMKHFMMtYQwUPgjBxxANwxvR0eCmZIZvWzi0UbNMPCMr2HbIvMcIyRk8gqXMUgZbazfPY2DRXiNt5nIyO_sOnYw_z7CSKtaf1wqwvPTgoJ1YR5IvHPXS6AoqE0DcH2ZDwVxibqogzklFydbD0Dl2Us')" }}
                            ></div>
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1">
                    {children}
                </div>
            </main>
        </div>
    )
}
