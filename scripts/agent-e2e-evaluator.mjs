/**
 * Agente Evaluador y Reportero E2E hacia EPMS para SistemaVentasRetail
 * Ejecuta la suite E2E de Playwright, consolida el informe forense
 * y emite telemetría en tiempo real al servidor MCP de EPMS.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const EPMS_MCP_URL = "https://exkalibur.mx/api/mcp";
const EPMS_TOKEN = "epms_7GZQ6KJ-FUbp6fOT-HWt6ogpvlqjmZstZYHNjQ8Bgzo";
const TASK_ID = process.env.EPMS_TASK_ID || "4215e421-6660-4d62-aba3-3aaeeb2e297d";
const EVIDENCE_DIR = path.resolve("tests/e2e/evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function sendTelemetry(status, action, progress) {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "actualizar_telemetria_agente",
      arguments: {
        task_id: TASK_ID,
        agent_id: "Autonomous QA Evaluator: SistemaVentasRetail",
        status,
        action,
        progress,
      },
    },
  };

  try {
    const res = await fetch(EPMS_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${EPMS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log(`📡 Telemetría enviada a EPMS (${status}):`, data.result ? "OK" : data.error);
  } catch (err) {
    console.warn(`⚠️ No se pudo enviar telemetría a EPMS: ${err.message}`);
  }
}

async function main() {
  console.log("\n🛒 Agente Evaluador E2E: Iniciando ciclo de inspección en SistemaVentasRetail...");
  await sendTelemetry("running", "Ejecutando suite E2E completa en SistemaVentasRetail...", 50);

  let output = "";
  let passed = true;
  let exitCode = 0;

  try {
    output = execSync("npm run test:e2e", { encoding: "utf8", stdio: "pipe" });
    console.log(output);
  } catch (err) {
    passed = false;
    exitCode = err.status || 1;
    output = (err.stdout || "") + "\n" + (err.stderr || "");
    console.error(output);
  }

  const report = {
    timestamp: new Date().toISOString(),
    system: "SistemaVentasRetail",
    passed,
    exitCode,
    suites: [
      "HU-RET-001 (POS, Caja, PWA Offline, Corte Z)",
      "HU-RET-002 (Clientes, Venta a Crédito, Abonos)",
      "HU-RET-003 (Compras, Fletes Prorrateados, Inventario Inmutable)",
      "Smoke General de Navegación",
      "Devoluciones",
      "Promociones 3x2",
      "Reportes de Ventas y Existencias",
    ],
    summaryOutput: output.slice(-2000), // últimos 2000 caracteres
  };

  const reportPath = path.join(EVIDENCE_DIR, "e2e-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  if (passed) {
    console.log("\n🎉 ¡Verificación exitosa en SistemaVentasRetail! Todas las suites pasaron.");
    await sendTelemetry(
      "success",
      `Suite E2E aprobada exitosamente en SistemaVentasRetail (${report.suites.length} flujos verificados)`,
      100
    );
  } else {
    console.error(`\n🚨 Fallas detectadas durante la ejecución de la suite E2E.`);
    console.error(`📸 Revisa capturas en tests/e2e/shots/ y reporte en tests/e2e/evidence/`);
    await sendTelemetry(
      "failed",
      `Fallas detectadas en suite E2E de SistemaVentasRetail. Reporte forense en tests/e2e/evidence/`,
      100
    );
    process.exit(1);
  }
}

main();
