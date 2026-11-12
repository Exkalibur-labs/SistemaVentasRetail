/**
 * Fixtures Declarativos de Datos para Pruebas E2E en SistemaVentasRetail
 * Garantiza escenarios reproducibles e invariantes de prueba para cada Historia de Usuario.
 */

export const retailFixtures = {
  // Escenario HU-RET-001: POS, Caja, PWA Offline y Corte Z
  pos: {
    specId: "HU-RET-001",
    specFile: "tests/e2e/specs/01-pos-caja-offline-corte-z.spec.md",
    targetRoute: "/pos",
    cajaRoute: "/caja",
    openingFund: "500",
    cashierUser: {
      username: "cajero",
      password: "Cajero1234!",
    },
    sampleBarcode: "75010001", // Código estándar de producto de prueba
  },

  // Escenario HU-RET-002: Clientes, Crédito Comercial y Abonos
  clientes: {
    specId: "HU-RET-002",
    specFile: "tests/e2e/specs/02-clientes-credito-abonos.spec.md",
    targetRoute: "/clientes",
    sampleClient: {
      name: "Cliente Frecuente E2E",
      creditLimitCents: 150000, // $1,500.00 MXN
      initialDepositCents: 20000, // $200.00 MXN
    },
  },

  // Escenario HU-RET-003: Compras a Proveedores e Inventario Inmutable
  compras: {
    specId: "HU-RET-003",
    specFile: "tests/e2e/specs/03-compras-inventario-inmutable.spec.md",
    targetRoute: "/compras",
    ownerUser: {
      username: "dueno",
      password: "Dueno1234!",
    },
    sampleFreightCents: 5000, // $50.00 MXN de flete prorrateado
  },
};
