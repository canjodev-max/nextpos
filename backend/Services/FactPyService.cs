using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using SaasPos.Backend.Data;
using SaasPos.Backend.Models;

namespace SaasPos.Backend.Services
{
    public class FactPyOptions
    {
        public bool UseSandbox { get; set; } = false;
        public string BaseUrl { get; set; } = string.Empty;
        public string SandboxBaseUrl { get; set; } = string.Empty;
        public string EmitterRuc { get; set; } = string.Empty;
        public string PointOfSale { get; set; } = "001";
        public string DocumentType { get; set; } = "FACTURA_A";
        public int DocumentTypeCode { get; set; } = 1;
        public int TipoEmision { get; set; } = 1;
        public int TipoTransaccion { get; set; } = 1;
        public int TipoPago { get; set; } = 1;
        public string Currency { get; set; } = "PYG";
        public string CountryCode { get; set; } = "PYG";
        public int DefaultIvaType { get; set; } = 1;
        public decimal DefaultIvaRate { get; set; } = 0;
        public string InvoiceEndpoint { get; set; } = "data.php";
        public string SandboxInvoiceEndpoint { get; set; } = string.Empty;
        public string RecordId { get; set; } = string.Empty;
    }

    public class FactPyService
    {
        private readonly AppDbContext _context;
        private readonly HttpClient _client;
        private readonly FactPyOptions _options;

        public FactPyService(AppDbContext context, HttpClient client, IOptions<FactPyOptions> options)
        {
            _context = context;
            _client = client;
            _options = options.Value;

            var baseUrl = _options.UseSandbox
                ? _options.SandboxBaseUrl
                : _options.BaseUrl;

            if (string.IsNullOrWhiteSpace(baseUrl))
                throw new InvalidOperationException("FactPy BaseUrl is not configured.");

            _client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task<Invoice> GenerateInvoiceAsync(Sale sale, Invoice? existingInvoice = null)
        {
            if (sale == null) throw new ArgumentNullException(nameof(sale));
            if (sale.Items == null || sale.Items.Count == 0)
                throw new InvalidOperationException("Cannot generate invoice without sale items.");

            var invoice = existingInvoice ?? new Invoice
            {
                SaleId = sale.Id,
                TenantId = sale.TenantId,
                Status = "PENDING",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (existingInvoice == null)
                await _context.Invoices.AddAsync(invoice);
            else
            {
                invoice.Status = "PENDING";
                invoice.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            var jsonPayload = BuildInvoicePayload(sale);
            var endpoint = _options.UseSandbox && !string.IsNullOrWhiteSpace(_options.SandboxInvoiceEndpoint)
                ? _options.SandboxInvoiceEndpoint
                : _options.InvoiceEndpoint;

            // Send as multipart/form-data per FactPy API spec
            using (var content = new MultipartFormDataContent())
            {
                var recordId = string.IsNullOrWhiteSpace(_options.RecordId) ? sale.Id.ToString() : _options.RecordId;
                content.Add(new StringContent(recordId, System.Text.Encoding.UTF8), "recordID");
                content.Add(new StringContent(System.Text.Json.JsonSerializer.Serialize(jsonPayload), System.Text.Encoding.UTF8), "dataJson");

                var response = await _client.PostAsync(endpoint, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                invoice.ResponseData = responseBody;
                invoice.UpdatedAt = DateTime.UtcNow;

                if (!response.IsSuccessStatusCode)
                {
                    invoice.Status = "FAILED";
                    await _context.SaveChangesAsync();
                    return invoice;
                }

                var document = JsonSerializer.Deserialize<JsonElement>(responseBody);
                var isSuccess = document.TryGetProperty("status", out var statusElement) && statusElement.GetBoolean();

                if (!isSuccess)
                {
                    invoice.Status = "FAILED";
                    await _context.SaveChangesAsync();
                    return invoice;
                }

                invoice.ExternalId = TryGetJsonString(document, "recordID") ?? TryGetJsonString(document, "cdc");
                invoice.InvoiceNumber = TryGetJsonString(document, "cdc");
                invoice.InvoiceUrl = TryGetJsonString(document, "kude") ?? TryGetJsonString(document, "link");
                invoice.Status = "ISSUED";

                // Store CDC, link and xmlLink in ResponseData for later reference
                // These are available in the response and can be parsed from invoice.ResponseData

                await _context.SaveChangesAsync();
                return invoice;
            }
        }

        private object BuildInvoicePayload(Sale sale)
        {
            var customer = sale.Customer;
            var firstPayment = sale.Payments.FirstOrDefault();
            var tipoPago = firstPayment != null ? MapPaymentType(firstPayment.Method).ToString() : _options.TipoPago.ToString();
            var fecha = sale.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss");

            return new
            {
                fecha,
                establecimiento = _options.PointOfSale,
                punto = _options.PointOfSale,
                numero = sale.Id.ToString().Substring(0, Math.Min(7, sale.Id.ToString().Length)).PadLeft(7, '0'),
                tipoDocumento = _options.DocumentTypeCode,
                condicionPago = 1,
                moneda = _options.Currency,
                receiptid = string.IsNullOrWhiteSpace(_options.RecordId) ? sale.Id.ToString() : _options.RecordId,
                cliente = new
                {
                    ruc = customer?.DocumentId ?? "0",
                    nombre = customer?.Name ?? "Consumidor Final",
                    correo = customer?.Email
                },
                items = sale.Items.Select(item => new
                {
                    descripcion = item.Product?.Name ?? "Producto",
                    cantidad = item.Quantity,
                    precioUnitario = item.Price
                }).ToList(),
                pagos = new[]
                {
                    new
                    {
                        tipoPago,
                        monto = sale.Total
                    }
                },
                totalPago = sale.Total
            };
        }

        private static int MapPaymentType(string paymentMethod)
        {
            return paymentMethod?.ToUpperInvariant() switch
            {
                "CARD" => 2,
                "QR" => 4,
                "TRANSFER" => 3,
                "CASH" => 1,
                _ => 1
            };
        }

        private static string? TryGetJsonString(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var value) && value.ValueKind != JsonValueKind.Null)
                return value.GetString();
            return null;
        }
    }
}
