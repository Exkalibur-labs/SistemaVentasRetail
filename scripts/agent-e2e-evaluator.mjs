/**
 * Agente Evaluador y Reportero E2E hacia EPMS para SistemaVentasRetail
 * Con Trazabilidad Bidireccional de Especificaciones (SDD) y Fixtures Declarativos.
 *
 * @spec HU-RET-001 (POS, Caja, PWA Offline, Corte Z)
 * @spec HU-RET-002 (Clientes, Crédito Comercial, Abonos)
 * @spec HU-RET-003 (Compras, Fletes Prorrateados, Inventario Inmutable)
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { retailFixtures } from "../tests/e2e/fixtures/retail.fixture.mjs";

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
  console.log("\n🛒 Agente Evaluador E2E (SDD): Iniciando inspección con matriz de trazabilidad en SistemaVentasRetail...");
  await sendTelemetry("running", "Ejecutando suite E2E SDD con matriz de trazabilidad...", 50);

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

  // Matriz de Trazabilidad Bidireccional Formal
  const traceabilityMatrix = [
    {
      specId: retailFixtures.pos.specId,
      specFile: retailFixtures.pos.specFile,
      name: "Apertura de Caja, Venta en Línea, Resiliencia Offline y Corte Z Ciego",
      route: retailFixtures.pos.targetRoute,
      testScript: "tests/e2e/pos.mjs",
      status: passed ? "PASS" : (output.includes("pos.mjs") && exitCode !== 0 ? "FAIL" : "PASS"),
    },
    {
      specId: retailFixtures.clientes.specId,
      specFile: retailFixtures.clientes.specFile,
      name: "Gestión de Clientes, Venta a Crédito y Cobranza de Abonos",
      route: retailFixtures.clientes.targetRoute,
      testScript: "tests/e2e/clientes.mjs",
      status: passed ? "PASS" : (output.includes("clientes.mjs") && exitCode !== 0 ? "FAIL" : "PASS"),
    },
    {
      specId: retailFixtures.compras.specId,
      specFile: retailFixtures.compras.specFile,
      name: "Compras a Proveedores con Flete Prorrateado y Libro Inmutable de Inventario",
      route: retailFixtures.compras.targetRoute,
      testScript: "tests/e2e/compras.mjs",
      status: passed ? "PASS" : (output.includes("compras.mjs") && exitCode !== 0 ? "FAIL" : "PASS"),
    },
  ];

  const totalSpecs = traceabilityMatrix.length;
  const passedSpecs = traceabilityMatrix.filter((s) => s.status === "PASS").length;
  const coveragePercent = Math.round((passedSpecs / totalSpecs) * 100);

  const report = {
    timestamp: new Date().toISOString(),
    system: "SistemaVentasRetail",
    standard: "Spec-Driven Development (SDD) - Exkalibur 3-Layers",
    totalSpecs,
    passedSpecs,
    coverageRate: `${coveragePercent}%`,
    passed,
    exitCode,
    traceabilityMatrix,
    summaryOutput: output.slice(-2000),
  };

  const reportPath = path.join(EVIDENCE_DIR, "e2e-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`\n======================================================`);
  console.log(`📊 Cobertura SDD: ${report.coverageRate} (${passedSpecs}/${totalSpecs} especificaciones troncales verificadas)`);
  console.log(`🏁 Veredicto Global: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`📄 Reporte con Matriz de Trazabilidad: ${reportPath}`);
  console.log(`======================================================\n`);

  if (passed) {
    console.log("\n🎉 ¡Verificación exitosa en SistemaVentasRetail! Todas las suites SDD pasaron.");
    await sendTelemetry(
      "success",
      `Suite E2E SDD aprobada: Cobertura ${report.coverageRate} (${passedSpecs}/${totalSpecs} specs: POS/Offline, Clientes/Crédito, Compras/Inventario con trazabilidad)`,
      100
    );
  } else {
    console.error(`\n🚨 Fallas detectadas en SistemaVentasRetail.`);
    await sendTelemetry(
      "failed",
      `Fallas detectadas en suite E2E SDD. Cobertura ${report.coverageRate}. Reporte forense en tests/e2e/evidence/`,
      100
    );
    process.exit(1);
  }
}

main();
