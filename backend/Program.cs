using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SaasPos.Backend.Data;
using SaasPos.Backend.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add Services
builder.Services.AddControllers(options =>
{
    var policy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    options.Filters.Add(new AuthorizeFilter(policy));
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SaaS POS API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            new string[] {}
        }
    });
});

// DbContext — solo Postgres
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

if (string.IsNullOrEmpty(connectionString))
    throw new InvalidOperationException("No database connection string configured. Set ConnectionStrings__DefaultConnection or DATABASE_URL.");

// Railway genera URLs tipo postgresql://user:pass@host:port/db — convertir a formato Npgsql
if (connectionString.StartsWith("postgresql://") || connectionString.StartsWith("postgres://"))
{
    var uri = new Uri(connectionString);
    connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={uri.UserInfo.Split(':')[0]};Password={uri.UserInfo.Split(':')[1]};SSL Mode=Require;Trust Server Certificate=true";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Authentication
var jwtSecret = builder.Configuration["JWT_SECRET"];
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "simpos";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "simpos";
var jwtExpiresInMinutes = builder.Configuration["JWT_EXPIRES_IN_MINUTES"];

if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException("JWT_SECRET must be configured. Set JWT_SECRET in environment variables.");
}

var jwtLifetimeMinutes = int.TryParse(jwtExpiresInMinutes, out var expires)
    ? expires
    : 60;

var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Railway maneja HTTPS en el edge
    options.SaveToken = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

builder.Services.AddAuthorization();

// CORS (Allow Frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var frontendUrl = builder.Configuration["FRONTEND_URL"];
        if (string.IsNullOrWhiteSpace(frontendUrl))
        {
            throw new InvalidOperationException("FRONTEND_URL must be configured. Set FRONTEND_URL in appsettings or environment variables.");
        }

        policy.WithOrigins(frontendUrl)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

// Services
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<CashService>();
builder.Services.AddScoped<DebtService>();
builder.Services.AddHttpClient<FactPyService>();
builder.Services.Configure<FactPyOptions>(builder.Configuration.GetSection("FactPy"));

var app = builder.Build();

// Migrate on Startup
using (var scope = app.Services.CreateScope())
{
    var serviceProvider = scope.ServiceProvider;
    try
    {
        var db = serviceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
        Console.WriteLine("Database initialized successfully.");

        // Migrations manuales: agregar columnas nuevas si no existen
        var columnMigrations = new[]
        {
            // Tablas nuevas
            @"CREATE TABLE IF NOT EXISTS ""CustomerDebts"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""CustomerId"" uuid NOT NULL,
                ""Amount"" numeric(12,2) NOT NULL,
                ""PaidAmount"" numeric(12,2) NOT NULL DEFAULT 0,
                ""DueDate"" timestamp NOT NULL,
                ""Status"" text NOT NULL DEFAULT 'PENDING',
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""DebtPayments"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""CustomerDebtId"" uuid NOT NULL,
                ""Amount"" numeric(12,2) NOT NULL,
                ""PaymentMethod"" text NOT NULL,
                ""CashRegisterId"" uuid NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';",
            @"ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""DocumentId"" text NULL;",
            @"ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""BirthDate"" timestamp NULL;",
            // Make Phone/Email nullable in case they were created as NOT NULL
            @"ALTER TABLE ""Customers"" ALTER COLUMN ""Phone"" DROP NOT NULL;",
            @"ALTER TABLE ""Customers"" ALTER COLUMN ""Email"" DROP NOT NULL;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""TrackStock"" boolean NOT NULL DEFAULT true;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""SaleType"" text NOT NULL DEFAULT 'UNIT';",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""DiscountPercentage"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""IsPriority"" boolean NOT NULL DEFAULT false;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""IdealStock"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""WholesalePrice"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""WholesaleMinQty"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""Status"" text NOT NULL DEFAULT 'ACTIVE';",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""Cost"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""InternalCode"" text NOT NULL DEFAULT '';",
            @"CREATE TABLE IF NOT EXISTS ""Notifications"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""TenantId"" uuid NULL,
                ""Type"" text NOT NULL DEFAULT 'INFO',
                ""Title"" text NOT NULL,
                ""Message"" text NOT NULL,
                ""IsRead"" boolean NOT NULL DEFAULT false,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""Invoices"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""SaleId"" uuid NOT NULL,
                ""TenantId"" uuid NOT NULL,
                ""Status"" text NOT NULL DEFAULT 'PENDING',
                ""ExternalId"" text NULL,
                ""InvoiceNumber"" text NULL,
                ""InvoiceUrl"" text NULL,
                ""ResponseData"" text NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
            );",
        };
        foreach (var sql in columnMigrations)
        {
            try { db.Database.ExecuteSqlRaw(sql); }
            catch (Exception colEx) { Console.WriteLine($"Column migration skipped: {colEx.Message}"); }
        }

            // Migración: campos SIFEN / e-Kuatia en Tenants
            var sifenMigrations = new[]
            {
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Ruc"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""RazonSocial"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""NombreFantasia"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""ActividadEconomicaCodigo"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""ActividadEconomicaDescripcion"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TipoContribuyente"" integer NOT NULL DEFAULT 2;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TipoRegimen"" integer NOT NULL DEFAULT 8;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TimbradoNumero"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TimbradoFecha"" timestamp NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CodigoEstablecimiento"" text NOT NULL DEFAULT '001';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""PuntoExpedicion"" text NOT NULL DEFAULT '001';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DireccionEstablecimiento"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Departamento"" integer NOT NULL DEFAULT 11;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DepartamentoDescripcion"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Distrito"" integer NOT NULL DEFAULT 145;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DistritoDescripcion"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Ciudad"" integer NOT NULL DEFAULT 3432;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CiudadDescripcion"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TelefonoEstablecimiento"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""EmailEstablecimiento"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DenominacionEstablecimiento"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CertificadoPath"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CertificadoPassword"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Csc"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CscId"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""SifenHabilitado"" boolean NOT NULL DEFAULT false;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""SifenAmbiente"" text NOT NULL DEFAULT 'test';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""UltimoNumeroDe"" integer NOT NULL DEFAULT 0;",
            };
            foreach (var sql in sifenMigrations)
            {
                try { db.Database.ExecuteSqlRaw(sql); }
                catch (Exception colEx) { Console.WriteLine($"SIFEN migration skipped: {colEx.Message}"); }
            }

        // Fix: limpiar imageUrl con placehold.co (datos sucios de versiones anteriores)
        try
        {
            db.Database.ExecuteSqlRaw(@"UPDATE ""Products"" SET ""ImageUrl"" = NULL WHERE ""ImageUrl"" LIKE '%placehold%';");
            Console.WriteLine("ImageUrl cleanup applied.");
        }
        catch (Exception imgEx) { Console.WriteLine($"ImageUrl cleanup skipped: {imgEx.Message}"); }

        // Fix: si hay productos/categorías con TenantId vacío, asignarles el primer tenant activo
        try
        {
            var firstTenant = db.Tenants.OrderBy(t => t.CreatedAt).FirstOrDefault();
            if (firstTenant != null)
            {
                db.Database.ExecuteSqlRaw($@"
                    UPDATE ""Products"" SET ""TenantId"" = '{firstTenant.Id}'
                    WHERE ""TenantId"" = '00000000-0000-0000-0000-000000000000';
                ");
                db.Database.ExecuteSqlRaw($@"
                    UPDATE ""Categories"" SET ""TenantId"" = '{firstTenant.Id}'
                    WHERE ""TenantId"" = '00000000-0000-0000-0000-000000000000';
                ");
                Console.WriteLine($"TenantId fix applied for tenant: {firstTenant.Name} ({firstTenant.Id})");
            }
        }
        catch (Exception tenantFixEx)
        {
            Console.WriteLine($"TenantId fix skipped: {tenantFixEx.Message}");
        }

        // Seed initial data only when the database is empty (first deploy)
        if (!db.Users.Any())
        {
            Console.WriteLine("Empty database detected — seeding initial data...");
            db.SeedData();
            Console.WriteLine("Database seeded successfully.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred during database initialization: {ex.Message}");
    }
}

// Config Pipeline
app.UseForwardedHeaders();

// Railway maneja HTTPS en el edge — no redirigir internamente o causa 308 loop
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
