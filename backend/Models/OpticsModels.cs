using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SaasPos.Backend.Models
{
    public class LensType
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Name { get; set; }
        public decimal BasePrice { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class LensIndex
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Name { get; set; }
        public decimal AdditionalPrice { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class LensExtra
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Name { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class GraduationRange
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public decimal MinValue { get; set; }
        public decimal MaxValue { get; set; }
        public decimal AdditionalCost { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class OpticalPrescription
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }

        // Ojo Derecho (OD)
        public decimal OdEsfera { get; set; }
        public decimal OdCilindro { get; set; }
        public decimal OdEje { get; set; }
        public decimal OdAdicion { get; set; }

        // Ojo Izquierdo (OI)
        public decimal OiEsfera { get; set; }
        public decimal OiCilindro { get; set; }
        public decimal OiEje { get; set; }
        public decimal OiAdicion { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class OpticalQuote
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }

        // Cliente (reuse existing Customer)
        public Guid? CustomerId { get; set; }

        // Marco (reuse existing Product)
        public Guid? FrameProductId { get; set; }
        public string? FrameCode { get; set; }
        public string? FrameDescription { get; set; }
        public string? FrameBrand { get; set; }
        public decimal? FramePrice { get; set; }

        // Lente
        public Guid? LensTypeId { get; set; }
        public string? LensTypeName { get; set; }
        public decimal LensTypeBasePrice { get; set; }

        // Índice
        public Guid? LensIndexId { get; set; }
        public string? LensIndexName { get; set; }
        public decimal LensIndexAdditionalPrice { get; set; }

        // Receta
        public Guid? PrescriptionId { get; set; }

        // Rangos de graduación detectados
        public Guid? GraduationRangeOdId { get; set; }
        public decimal GraduationRangeOdCost { get; set; }
        public Guid? GraduationRangeOiId { get; set; }
        public decimal GraduationRangeOiCost { get; set; }

        // Extras seleccionados (JSON array de ids)
        public string ExtraIds { get; set; } = "[]";
        public decimal ExtrasTotalCost { get; set; }

        // Totales
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal Total { get; set; }

        // Promociones aplicadas (JSON)
        public string AppliedRules { get; set; } = "[]";

        // Estado
        public string Status { get; set; } = "QUOTE"; // QUOTE, CONVERTED, CANCELLED
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("CustomerId")]
        public Customer? Customer { get; set; }
    }

    public class PromotionalRule
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string RuleType { get; set; }
        // FREE_EXTRA, DISCOUNT_LENS, DISCOUNT_FRAME, SPECIAL_COMBO, DISCOUNT_TOTAL
        public string? TargetId { get; set; }
        public string? ConditionType { get; set; }
        public string? ConditionValue { get; set; }
        public string? BenefitType { get; set; }
        public string? BenefitValue { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
