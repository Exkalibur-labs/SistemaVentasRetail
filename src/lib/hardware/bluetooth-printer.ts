/**
 * Adaptador de hardware para impresoras térmicas ESC/POS (Bluetooth / USB).
 * Especializado en miniprinters de 58 mm (p. ej. SUZWIP Bluetooth+USB) y 80 mm estándar.
 */

// Servicios GATT Bluetooth conocidos para impresoras térmicas chinas (ESC/POS)
const KNOWN_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Servicio estándar ESC/POS
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Serial Port Profile (muy común en SUZWIP y Goojprt)
  "0000e781-0000-1000-8000-00805f9b34fb",
];

export type PrinterWidth = "58mm" | "80mm";

export interface EscPosLineItem {
  name: string;
  qty: number | string;
  price: string;
  total: string;
}

export interface EscPosTicketData {
  companyName: string;
  branchName: string;
  address?: string;
  phone?: string;
  rfc?: string;
  folio: string;
  date: string;
  cashier: string;
  customer?: string;
  items: EscPosLineItem[];
  subtotal: string;
  tax: string;
  discount?: string;
  total: string;
  paymentMethod: string;
  received?: string;
  change?: string;
  footerText?: string;
}

/** Comandos binarios ESC/POS estándar */
const ESC = 0x1b;
const GS = 0x1d;

export class EscPosBuilder {
  private buffer: number[] = [];
  private cols: number;

  constructor(width: PrinterWidth = "58mm") {
    // 58 mm = 32 caracteres por línea (Fuente A, 12x24)
    // 80 mm = 48 caracteres por línea
    this.cols = width === "58mm" ? 32 : 48;
    this.init();
  }

  init() {
    this.buffer.push(ESC, 0x40); // Inicializar impresora
    return this;
  }

  alignCenter() {
    this.buffer.push(ESC, 0x61, 0x01);
    return this;
  }

  alignLeft() {
    this.buffer.push(ESC, 0x61, 0x00);
    return this;
  }

  alignRight() {
    this.buffer.push(ESC, 0x61, 0x02);
    return this;
  }

  bold(enable = true) {
    this.buffer.push(ESC, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  doubleHeight(enable = true) {
    this.buffer.push(GS, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  text(str: string) {
    // Normalizar a ASCII/Latin1 para compatibilidad con microcontroladores térmicos
    const clean = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      this.buffer.push(code < 128 ? code : 0x3f);
    }
    return this;
  }

  line(str = "") {
    if (str) this.text(str);
    this.buffer.push(0x0a);
    return this;
  }

  divider(char = "-") {
    return this.line(char.repeat(this.cols));
  }

  twoColumns(left: string, right: string) {
    const space = this.cols - left.length - right.length;
    if (space >= 1) {
      return this.line(left + " ".repeat(space) + right);
    }
    // Si no cabe en una línea, recortar o partir
    const trimmedLeft = left.slice(0, this.cols - right.length - 1);
    const newSpace = Math.max(1, this.cols - trimmedLeft.length - right.length);
    return this.line(trimmedLeft + " ".repeat(newSpace) + right);
  }

  feed(lines = 3) {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  cut() {
    this.buffer.push(GS, 0x56, 0x41, 0x03);
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/** Construye los bytes binarios de un ticket para 58mm o 80mm */
export function buildTicketEscPos(data: EscPosTicketData, width: PrinterWidth = "58mm"): Uint8Array {
  const b = new EscPosBuilder(width);

  // Encabezado
  b.alignCenter().bold(true).doubleHeight(true).line(data.companyName).doubleHeight(false);
  if (data.branchName) b.line(data.branchName);
  b.bold(false);
  if (data.rfc) b.line(`RFC: ${data.rfc}`);
  if (data.address) b.line(data.address);
  if (data.phone) b.line(`Tel: ${data.phone}`);

  b.alignLeft().divider();
  b.twoColumns(`Folio: ${data.folio}`, data.date);
  b.line(`Caja/Atendio: ${data.cashier}`);
  if (data.customer) b.line(`Cliente: ${data.customer}`);
  b.divider();

  // Partidas
  for (const item of data.items) {
    b.line(item.name);
    b.twoColumns(` ${item.qty} x ${item.price}`, item.total);
  }
  b.divider();

  // Totales
  b.twoColumns("Subtotal:", data.subtotal);
  b.twoColumns("Impuestos:", data.tax);
  if (data.discount) {
    b.twoColumns("Descuento:", `-${data.discount}`);
  }
  b.bold(true).doubleHeight(true);
  b.twoColumns("TOTAL:", data.total);
  b.bold(false).doubleHeight(false);

  b.divider();
  b.twoColumns("Metodo de pago:", data.paymentMethod);
  if (data.received) b.twoColumns("Recibido:", data.received);
  if (data.change) b.twoColumns("Cambio:", data.change);

  b.divider();
  b.alignCenter();
  b.line(data.footerText || "Gracias por su compra!");
  b.line("No es comprobante fiscal");
  b.feed(3).cut();

  return b.getBytes();
}

/**
 * Imprime un ticket directamente a través de Web Bluetooth.
 * Si el navegador soporta Web Bluetooth, solicita el dispositivo y envía los bytes ESC/POS.
 */
export async function printViaWebBluetooth(
  ticketBytes: Uint8Array,
): Promise<{ success: boolean; error?: string }> {
  if (typeof navigator === "undefined" || !(navigator as unknown as { bluetooth?: unknown }).bluetooth) {
    return { success: false, error: "Web Bluetooth no está soportado en este navegador. Utiliza Google Chrome o Edge en Android, Windows o macOS." };
  }

  try {
    const navBt = (navigator as unknown as { bluetooth: {
      requestDevice: (opts: unknown) => Promise<{
        name?: string;
        gatt?: {
          connect: () => Promise<{
            getPrimaryServices: () => Promise<Array<{
              getCharacteristics: () => Promise<Array<{
                properties: { write: boolean; writeWithoutResponse: boolean };
                writeValue: (data: BufferSource) => Promise<void>;
                writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
              }>>;
            }>>;
          }>;
        };
      }>;
    } }).bluetooth;

    // Buscar dispositivo Bluetooth (ej. SUZWIP, MPT-II, POS-58, etc.)
    const device = await navBt.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_PRINTER_SERVICES,
    });

    if (!device.gatt) {
      return { success: false, error: "El dispositivo no tiene interfaz GATT disponible." };
    }

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    let writeChar: {
      properties: { write: boolean; writeWithoutResponse: boolean };
      writeValue: (data: BufferSource) => Promise<void>;
      writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
    } | null = null;

    // Buscar una característica con propiedad de escritura
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      return { success: false, error: "No se encontró un canal de escritura ESC/POS en la impresora Bluetooth seleccionada." };
    }

    // Enviar en bloques de 128 bytes para no desbordar el búfer de la impresora térmica
    const CHUNK_SIZE = 128;
    for (let offset = 0; offset < ticketBytes.length; offset += CHUNK_SIZE) {
      const chunk = ticketBytes.slice(offset, offset + CHUNK_SIZE);
      if (writeChar.writeValueWithoutResponse && writeChar.properties.writeWithoutResponse) {
        await writeChar.writeValueWithoutResponse(chunk);
      } else {
        await writeChar.writeValue(chunk);
      }
      // Pequeña pausa para permitir que el microcontrolador procese
      await new Promise((r) => setTimeout(r, 25));
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("User cancelled")) {
      return { success: false, error: "Conexión Bluetooth cancelada por el usuario." };
    }
    return { success: false, error: msg };
  }
}
