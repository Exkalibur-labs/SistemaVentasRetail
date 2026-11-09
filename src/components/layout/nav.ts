import type { Permission } from "@/server/authz/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "building" | "store" | "users" | "shield" | "settings" | "scroll" | "server" | "cart" | "receipt" | "wallet" | "package" | "boxes" | "truck" | "contact" | "percent" | "chart";
  /** Sección del menú. */
  group?: "operacion" | "administracion";
  permission?: Permission;
  /** Estado desactivado con hover de próximamente */
  disabled?: boolean;
  tooltip?: string;
};

/** Navegación principal. Cada entrada se muestra solo si el usuario tiene el permiso (y el módulo está activo). */
export const NAV_ITEMS: NavItem[] = [
  // Módulos Core Listos y Operativos
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/pos", label: "Punto de venta", icon: "cart", permission: "pos.sell", group: "operacion" },
  { href: "/ventas", label: "Ventas", icon: "receipt", permission: "pos.sell", group: "operacion" },
  { href: "/caja", label: "Caja", icon: "wallet", permission: "cash.open", group: "operacion" },
  { href: "/catalogo", label: "Catálogo", icon: "package", permission: "catalog.view", group: "operacion" },
  { href: "/inventario", label: "Inventario", icon: "boxes", permission: "inventory.view", group: "operacion" },
  { href: "/compras", label: "Compras", icon: "truck", permission: "purchases.view", group: "operacion" },
  { href: "/reportes", label: "Reportes", icon: "chart", permission: "reports.view", group: "operacion" },
  { href: "/facturacion", label: "Facturación", icon: "scroll", permission: "invoicing.view", group: "operacion" },
  { group: "administracion", href: "/configuracion", label: "Configuración", icon: "settings", permission: "settings.view" },

  // Módulos no listos aún: desactivados con badge y hover 'Próximamente'
  { href: "/clientes", label: "Clientes", icon: "contact", permission: "customers.view", group: "operacion", disabled: true, tooltip: "Próximamente · Módulo de cartera, fidelización y crédito" },
  { href: "/promociones", label: "Promociones", icon: "percent", permission: "promotions.view", group: "operacion", disabled: true, tooltip: "Próximamente · Descuentos automáticos, combos y 2x1" },
  { group: "administracion", href: "/empresas", label: "Empresas", icon: "building", permission: "companies.view", disabled: true, tooltip: "Próximamente · Configuración multiempresa avanzada" },
  { group: "administracion", href: "/sucursales", label: "Sucursales", icon: "store", permission: "branches.view", disabled: true, tooltip: "Próximamente · Administración y asignación de sucursales" },
  { group: "administracion", href: "/usuarios", label: "Usuarios", icon: "users", permission: "users.view", disabled: true, tooltip: "Próximamente · Alta de cajeros y roles" },
  { group: "administracion", href: "/roles", label: "Roles", icon: "shield", permission: "roles.view", disabled: true, tooltip: "Próximamente · Matriz de permisos RBAC personalizada" },
  { group: "administracion", href: "/bitacora", label: "Bitácora", icon: "scroll", permission: "audit.view", disabled: true, tooltip: "Próximamente · Registro de auditoría forense" },
  { group: "administracion", href: "/plataforma", label: "Plataforma", icon: "server", permission: "platform.tenants.manage", disabled: true, tooltip: "Próximamente · Consola de administración general" },
];
