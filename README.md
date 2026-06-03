# simPOS — Sistema de Punto de Venta con Facturación Electrónica Paraguay

Sistema POS multi-tenant SaaS para negocios en Paraguay. Incluye terminal de venta táctil, gestión de inventario, control de caja, clientes con cuenta corriente, y facturación electrónica (SIFEN/e-Kuatia).

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix UI) |
| **Backend** | .NET 10, C#, ASP.NET Core Web API, Entity Framework Core 10 |
| **Base de datos** | PostgreSQL 15 |
| **Autenticación** | JWT (Bearer tokens) |
| **Deploy** | Docker, Railway, Nixpacks |

---

## Estructura del Proyecto

```
simPOS/
├── backend/                          # API .NET
│   ├── Controllers/                  # Endpoints REST
│   │   ├── AuthController.cs         # Login JWT
│   │   ├── SalesController.cs        # Ventas (CRUD, pagos, devoluciones)
│   │   ├── ProductsController.cs     # Productos
│   │   ├── InventoryController.cs    # Stock, movimientos, kardex, mermas
│   │   ├── CashController.cs         # Apertura/cierre de caja, movimientos
│   │   ├── CustomersController.cs    # Clientes
│   │   ├── DebtController.cs         # Deudas y pagos
│   │   ├── RolesController.cs        # Roles y permisos
│   │   ├── UsersController.cs        # Usuarios
│   │   ├── TenantsController.cs      # Multitenant (SIFEN/e-Kuatia)
│   │   └── NotificationsController.cs
│   ├── Models/
│   │   ├── Entities.cs               # Todas las entidades del modelo
│   │   └── RoleDtos.cs               # DTOs de roles
│   ├── Services/
│   │   ├── CashService.cs            # Lógica de caja
│   │   ├── DebtService.cs            # Lógica de deudas
│   │   ├── FactPyService.cs          # Integración facturación electrónica
│   │   └── InventoryService.cs       # Lógica de stock
│   ├── Data/
│   │   └── AppDbContext.cs           # DbContext + SeedData()
│   ├── Program.cs                    # Punto de entrada, configuración, migrations raw
│   ├── Dockerfile
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   └── appsettings.Production.json
├── saas-pos/                         # Frontend Next.js
│   ├── app/
│   │   ├── layout.tsx                # Layout raíz (Google Fonts, Material Symbols)
│   │   ├── page.tsx                  # Redirige a /login
│   │   ├── globals.css               # Tailwind + tema
│   │   ├── context/UserContext.tsx    # Contexto de autenticación
│   │   ├── (auth)/login/page.tsx     # Pantalla de login
│   │   └── (dashboard)/              # Panel principal (protegido)
│   │       ├── layout.tsx            # Sidebar + header
│   │       ├── page.tsx              # Dashboard principal
│   │       ├── pos/                  # Punto de venta
│   │       ├── cash/                 # Gestión de caja
│   │       ├── inventory/            # Inventario
│   │       ├── customers/            # Clientes
│   │       ├── roles/                # Roles y permisos
│   │       └── superadmin/           # Panel superadmin
│   ├── components/                   # Componentes reutilizables
│   │   ├── ui/                       # shadcn/ui (button, dialog, input, table, etc.)
│   │   ├── pos/                      # CheckoutModal, ReturnModal, QuickWasteModal
│   │   ├── cash/                     # OpenCashModal, CloseCashWizard, etc.
│   │   ├── inventory/                # AddProductTab, CategoriesManager, Kardex, Waste
│   │   ├── customers/                # CustomerDetailsModal
│   │   └── ...modals
│   ├── lib/
│   │   ├── api.ts                    # Cliente HTTP para la API
│   │   └── utils.ts                  # cn(), formatMoney()
│   └── public/                       # Assets estáticos
├── docker-compose.yml                # PostgreSQL + Backend + Frontend
├── .env.example                      # Variables de entorno de ejemplo
├── railway.json                      # Config Railway (backend)
└── planes-simPOS.md                  # Planes comerciales
```

---

## Funcionalidades

### Punto de Venta (POS)
- Terminal táctil rápida
- Búsqueda por nombre, código interno o código de barras
- Venta por unidad y por peso (granel)
- Descuentos por producto o por venta
- Múltiples métodos de pago: efectivo, tarjeta, QR, transferencia, crédito
- Cálculo automático de vuelto
- Ventas a crédito (cuenta corriente)
- Devoluciones y anulaciones

### Inventario
- CRUD de productos con imágenes
- Código interno, SKU, código de barras
- Precio de venta, costo, precio mayorista
- Control de stock con alertas de stock mínimo
- Productos sin control de stock (venta directa)
- Categorías
- Descuentos por producto
- Productos prioritarios
- Mermas y desperdicios
- Reposición de stock
- Kardex por producto (historial completo)
- Fechas de vencimiento

### Caja
- Apertura con monto inicial
- Ingresos y egresos manuales
- Resumen en tiempo real por método de pago
- Cierre con arqueo y diferencias
- Historial de sesiones
- Auditoría de cada movimiento
- Analytics semanales/mensuales

### Clientes
- Base de datos con cédula/RUC
- Teléfono, email, fecha de nacimiento
- Cuenta corriente con saldo deudor
- Historial de compras
- Deudas y pagos parciales
- Límite de crédito

### Usuarios y Roles
- Múltiples usuarios por tenant
- Roles: SUPERADMIN, ADMIN, MANAGER, CAJERO, VIEWER
- Permisos granulares (CRUD por módulo)
- Login con JWT

### Facturación Electrónica (SIFEN/e-Kuatia)
- Emisión de facturas, notas de crédito, notas de débito
- Generación de KuDE con QR
- Envío automático a SIFEN
- Consulta y reintento de documentos
- Soporte multi-régimen (Normal, Pequeño Contribuyente, Microempresa)
- Timbrado, establecimiento y punto de expedición

### Multi-Tenant
- Cada negocio (tenant) con sus propios datos
- Configuración SIFEN por tenant (RUC, timbrado, certificados)
- Aislamiento completo entre inquilinos

---

## Modelo de Datos (Entidades principales)

- **Tenant** — Negocio/cliente con configuración SIFEN
- **User** — Usuario del sistema (pertenece a un Tenant, tiene un Rol)
- **Role / Permission / RolePermission** — RBAC
- **Product** — Producto con stock, precios, categoría
- **Category** — Categoría de productos
- **Sale / SaleItem / Payment** — Ventas, ítems y pagos
- **Customer** — Cliente con saldo y límite de crédito
- **CustomerDebt / DebtPayment** — Deudas y pagos
- **CashRegister / CashMovement / CashSalesSummary / CashAuditLog** — Gestión de caja
- **StockMovement** — Kardex de inventario
- **Invoice** — Factura electrónica (SIFEN)
- **Notification** — Notificaciones del sistema

---

## Requisitos

- Docker y Docker Compose (para deploy con contenedores)
- O bien:
  - .NET 10 SDK
  - Node.js 20+
  - PostgreSQL 15

---

## Configuración de Variables de Entorno

Copiar `.env.example` como `.env`:

```env
POSTGRES_USER=saaspos_user
POSTGRES_PASSWORD=cambiar_por_password_seguro
JWT_SECRET=cambiar_por_secreto_muy_largo_y_aleatorio_minimo_32_chars
FRONTEND_URL=https://tu-dominio.com
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
```

---

## Desarrollo Local

### Backend

```bash
cd backend
cp appsettings.Development.json appsettings.json  # ya configurado para dev local
dotnet restore
dotnet run
```

La API corre en `http://localhost:5041`. Swagger en `/swagger`.

### Frontend

```bash
cd saas-pos
npm install
npm run dev
```

El frontend corre en `http://localhost:3000`.

### Base de datos

El backend requiere PostgreSQL. En desarrollo se configura la conexión en `appsettings.Development.json`:
```
Host=localhost;Port=5432;Database=saaspos_dev;Username=postgres;Password=postgres
```

Al iniciar, el backend ejecuta `EnsureCreated()` + migrations SQL raw automáticamente. Si la BD está vacía, inserta datos demo.

### Credenciales por defecto (demo)

| Rol | Email | Password |
|---|---|---|
| SUPERADMIN | admin@pos.com | admin123 |
| ADMIN | user@mail.com | 123456 |

---

## Deploy con Docker

```bash
docker compose up -d
```

Esto levanta:
- **PostgreSQL 15** en puerto `5432`
- **Backend** en puerto `5041`
- **Frontend** en puerto `3000`

Requiere archivo `.env` con las variables configuradas.

---

## Deploy en Railway

El proyecto incluye configuraciones para Railway:

- `railway.json` (raíz) — Servicio backend con Docker
- `saas-pos/railway.json` — Servicio frontend con Nixpacks
- `backend/railway.json` — Config alternativa del backend

Conectar los repositorios y configurar las variables de entorno en el dashboard de Railway.

---

## API — Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login JWT |
| GET | `/api/products` | Listar productos |
| POST | `/api/products` | Crear producto |
| GET | `/api/sales` | Listar ventas |
| POST | `/api/sales` | Crear venta |
| POST | `/api/sales/{id}/items` | Agregar item |
| POST | `/api/sales/{id}/pay` | Pagar venta |
| POST | `/api/sales/{id}/return` | Devolución |
| POST | `/api/cash/open` | Abrir caja |
| POST | `/api/cash/close` | Cerrar caja |
| GET | `/api/cash/summary/{id}` | Resumen de caja |
| GET | `/api/cash/history` | Historial de cierres |
| GET | `/api/cash/analytics` | Analytics semanal/mensual |
| GET | `/api/inventory/kardex/{productId}` | Kardex de producto |
| POST | `/api/inventory/waste` | Registrar merma |
| GET | `/api/customers` | Listar clientes |
| GET | `/api/customers/{id}/debts` | Deudas de cliente |
| POST | `/api/debt/{id}/pay` | Pagar deuda |
| GET | `/api/tenants` | Listar tenants |
| GET | `/api/tenants/{id}` | Detalle tenant (incluye config SIFEN) |
| GET | `/api/users` | Listar usuarios |
| GET | `/api/roles` | Listar roles con permisos |
| GET | `/health` | Health check |

---

## Planes Comerciales

Ver `planes-simPOS.md` para detalle de:
- **Plan Inicial** — Gs. 250.000/mes (POS, inventario, caja, clientes)
- **Plan Completo** — Gs. 300.000/mes (+ facturación electrónica, 150 facturas/mes)
- **Plan Enterprise** — 1% de ingresos netos/mes (facturación ilimitada, multi-sucursal, 24/7)
- **Plan Propietario** — Gs. 20.000.000 único (licencia perpetua, instalación local)

---

## Licencia

MIT License — Ver `LICENSE`
