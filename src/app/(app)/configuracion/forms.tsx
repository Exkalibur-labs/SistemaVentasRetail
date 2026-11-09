"use client";

import { AppForm, Checkbox, FormField, Input, Select, SubmitButton } from "@/components/ui/form";
import { updateModulesAction, updateSettingsAction } from "./actions";
import type { CompanySettings } from "@/server/db/schema";

export const MODULE_LABELS: Record<string, { label: string; hint: string; phase: number }> = {
  catalog: { label: "Catálogo", hint: "Productos, variantes, códigos de barras.", phase: 3 },
  inventory: { label: "Inventario", hint: "Existencias, movimientos, traspasos, conteos.", phase: 3 },
  pos: { label: "Punto de venta y caja", hint: "Ventas, tickets, apertura y corte de caja.", phase: 3 },
  purchases: { label: "Compras y proveedores", hint: "Órdenes de compra y recepciones.", phase: 4 },
  customers: { label: "Clientes", hint: "CRM, segmentos, historial.", phase: 4 },
  promotions: { label: "Promociones y precios", hint: "Descuentos, cupones, listas de precios.", phase: 4 },
  returns: { label: "Devoluciones y cambios", hint: "Reembolsos y crédito en tienda.", phase: 4 },
  credit: { label: "Crédito a clientes", hint: "Límites, saldos y cobranza.", phase: 4 },
  invoicing: { label: "Facturación electrónica", hint: "CFDI por proveedor (adaptador).", phase: 5 },
  reports: { label: "Reportes y dashboard", hint: "Ventas, utilidad, inventario, caja.", phase: 5 },
  channels: { label: "Canales y pedidos", hint: "Ecommerce, WhatsApp, marketplaces.", phase: 5 },
  loyalty: { label: "Lealtad", hint: "Puntos, tarjetas de regalo, saldo prepago.", phase: 5 },
};

export function ModulesForm({ companyId, modules, canManage }: { companyId: string; modules: Array<{ module: string; enabled: boolean }>; canManage: boolean }) {
  return (
    <AppForm action={updateModulesAction} successMessage="Módulos actualizados. La navegación y los permisos se recalculan de inmediato.">
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-2 sm:grid-cols-2">
        {modules.map((m) => {
          const meta = MODULE_LABELS[m.module] ?? { label: m.module, hint: "", phase: 0 };
          return <Checkbox key={m.module} name="modules[]" value={m.module} defaultChecked={m.enabled} disabled={!canManage} label={meta.label} hint={`${meta.hint} Pantallas: Fase ${meta.phase}.`} />;
        })}
      </div>
      {canManage && <SubmitButton>Guardar módulos</SubmitButton>}
    </AppForm>
  );
}

export function SettingsForm({
  companyId,
  settings,
  canManage,
}: {
  companyId: string;
  canManage: boolean;
  settings: CompanySettings;
}) {
  return (
    <AppForm action={updateSettingsAction} successMessage="Parámetros guardados.">
      <input type="hidden" name="companyId" value={companyId} />
      <fieldset disabled={!canManage} className="space-y-6">
        {/* Tropicalización y Marca */}
        <fieldset className="space-y-4 rounded-app border border-border p-4">
          <legend className="px-1 text-sm font-bold text-fg">🎨 Tropicalización y Marca</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="branding.logoUrl" label="URL del Logotipo" hint="Imagen visible en el encabezado de los tickets e interfaz.">
              <Input name="branding.logoUrl" placeholder="https://..." defaultValue={settings.branding?.logoUrl ?? ""} />
            </FormField>
            <FormField name="branding.theme" label="Tema visual / Paleta" hint="Color principal de la aplicación.">
              <Select name="branding.theme" defaultValue={settings.branding?.theme ?? "emerald"}>
                <option value="emerald">Verde Esmeralda (Retail / Abarrotes)</option>
                <option value="ocean">Azul Océano (Corporativo)</option>
                <option value="amber">Ámbar Cálido (Comercial / Panadería)</option>
                <option value="rose">Rosa / Magenta</option>
                <option value="slate">Gris Neutro / Minimalista</option>
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="branding.ticketHeader" label="Encabezado del Ticket" hint="Texto o leyendas adicionales al inicio del recibo.">
              <Input name="branding.ticketHeader" placeholder="¡Gracias por su compra en Abarrotes La Esquina!" defaultValue={settings.branding?.ticketHeader ?? ""} />
            </FormField>
            <FormField name="branding.ticketFooter" label="Pie del Ticket" hint="Mensaje de despedida, redes o política de cambios.">
              <Input name="branding.ticketFooter" placeholder="Cambios únicamente dentro de los primeros 7 días." defaultValue={settings.branding?.ticketFooter ?? ""} />
            </FormField>
          </div>
        </fieldset>

        {/* Hardware y Periféricos */}
        <fieldset className="space-y-4 rounded-app border border-border p-4">
          <legend className="px-1 text-sm font-bold text-fg">🖨️ Hardware y Periféricos</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="hardware.printerWidth" label="Ancho de Impresora Térmica" hint="SUZWIP 58mm (32 col) u 80mm estándar (48 col).">
              <Select name="hardware.printerWidth" defaultValue={settings.hardware?.printerWidth ?? "58mm"}>
                <option value="58mm">58 mm (Impresora Térmica SUZWIP / Bluetooth)</option>
                <option value="80mm">80 mm (Impresora Estándar de Mostrador)</option>
              </Select>
            </FormField>
            <FormField name="hardware.printerType" label="Método de Impresión" hint="Protocolo preferido para emisión de tickets.">
              <Select name="hardware.printerType" defaultValue={settings.hardware?.printerType ?? "bluetooth"}>
                <option value="bluetooth">Bluetooth Inalámbrico (Web Bluetooth ESC/POS)</option>
                <option value="browser">Diálogo de Impresión del Navegador</option>
                <option value="usb">USB Directo</option>
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="hardware.scannerMode" label="Modo del Escáner Znemaz" hint="Captura global de ráfagas HID.">
              <Select name="hardware.scannerMode" defaultValue={settings.hardware?.scannerMode ?? "hid_burst"}>
                <option value="hid_burst">Ráfaga Rápida HID (&lt;50ms entre caracteres)</option>
                <option value="keyboard">Emulación de Teclado con Enter</option>
                <option value="manual">Solo foco manual en campo de texto</option>
              </Select>
            </FormField>
            <div className="flex items-center pt-6">
              <Checkbox name="hardware.scannerBeep" label="Feedback acústico al escanear" hint="Emite un beep confirmatorio al detectar lectura válida." defaultChecked={settings.hardware?.scannerBeep ?? true} />
            </div>
          </div>
        </fieldset>

        {/* Parámetros Operativos */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField name="inventory.costingMethod" label="Método de costeo" hint="Cómo se calcula el costo de ventas y el valor del inventario.">
            <Select name="inventory.costingMethod" defaultValue={settings.inventory?.costingMethod ?? "average"}>
              <option value="average">Promedio ponderado</option>
              <option value="fifo">FIFO (primeras entradas, primeras salidas)</option>
              <option value="manual">Costo manual</option>
            </Select>
          </FormField>
          <FormField name="promotions.maxDiscountPercent" label="Descuento máximo en POS (%)" hint="Tope para descuentos manuales autorizados.">
            <Input name="promotions.maxDiscountPercent" type="number" min={0} max={100} defaultValue={settings.promotions?.maxDiscountPercent ?? 100} />
          </FormField>
          <FormField name="notifications.lowStockEmail" label="Correo para alertas de inventario bajo">
            <Input name="notifications.lowStockEmail" type="email" defaultValue={settings.notifications?.lowStockEmail ?? ""} />
          </FormField>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox name="inventory.allowNegativeStock" label="Permitir inventario negativo" hint="Vender aunque no haya existencia registrada (se alerta)." defaultChecked={settings.inventory?.allowNegativeStock ?? false} />
          <Checkbox name="promotions.allowStacking" label="Permitir acumular promociones" hint="Varias promociones compatibles en una misma venta." defaultChecked={settings.promotions?.allowStacking ?? false} />
          <Checkbox name="pos.allowSaleWithoutCustomer" label="Ventas sin cliente registrado" hint="Público en general." defaultChecked={settings.pos?.allowSaleWithoutCustomer ?? true} />
          <Checkbox name="pos.requireCustomerForCredit" label="Exigir cliente en ventas a crédito" defaultChecked={settings.pos?.requireCustomerForCredit ?? true} />
        </div>
        <fieldset className="space-y-3 rounded-app border border-border p-3">
          <legend className="px-1 text-sm font-medium">Devoluciones</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="returns.maxDays" label="Días para devolver" hint="Después se requiere autorización.">
              <Input name="returns.maxDays" type="number" min={0} max={365} defaultValue={settings.returns?.maxDays ?? 30} />
            </FormField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox name="returns.allowWithoutTicket" label="Aceptar devoluciones sin ticket" hint="Solo con vale y con permiso o autorización." defaultChecked={settings.returns?.allowWithoutTicket ?? true} />
            <Checkbox name="returns.cashRefundNeedsAuthorization" label="Reembolso en efectivo requiere autorización" hint="Un gerente confirma antes de sacar dinero de la caja." defaultChecked={settings.returns?.cashRefundNeedsAuthorization ?? true} />
          </div>
        </fieldset>
        {canManage && <SubmitButton>Guardar parámetros</SubmitButton>}
      </fieldset>
    </AppForm>
  );
}
