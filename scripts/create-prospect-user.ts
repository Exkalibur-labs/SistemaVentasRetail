import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/server/db";
import { companies, roles, tenants, userBranches, userCompanyRoles, users, branches } from "../src/server/db/schema";
import { hashPassword } from "../src/server/auth/password";

async function main() {
  const username = "demo_retail";
  const password = "Retail2026!";
  const fullName = "Cliente Demo / Prospecto Retail";
  const email = "prospecto@exkalibur.mx";

  // Buscar tenant demo
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, "demo")).limit(1);
  if (!tenant) {
    console.error("No se encontró tenant demo. Ejecuta npm run db:seed primero.");
    process.exit(1);
  }

  const [company] = await db.select().from(companies).where(eq(companies.tenantId, tenant.id)).limit(1);
  const [branch] = await db.select().from(branches).where(eq(branches.companyId, company.id)).limit(1);
  const [ownerRole] = await db.select().from(roles).where(and(isNull(roles.tenantId), eq(roles.key, "owner"))).limit(1);

  const passwordHash = await hashPassword(password);

  // Verificar si ya existe
  const [existing] = await db.select().from(users).where(and(eq(users.tenantId, tenant.id), eq(users.username, username))).limit(1);

  if (existing) {
    await db.update(users).set({ passwordHash, status: "active", mustChangePassword: false }).where(eq(users.id, existing.id));
    console.log(`✓ Usuario prospecto '${username}' actualizado exitosamente.`);
  } else {
    const [created] = await db.insert(users).values({
      tenantId: tenant.id,
      username,
      fullName,
      email,
      passwordHash,
      status: "active",
      mustChangePassword: false,
    }).returning();

    await db.insert(userCompanyRoles).values({
      tenantId: tenant.id,
      userId: created.id,
      companyId: company.id,
      roleId: ownerRole.id,
    });

    await db.insert(userBranches).values({
      tenantId: tenant.id,
      userId: created.id,
      branchId: branch.id,
    });

    console.log(`✓ Usuario prospecto '${username}' creado exitosamente.`);
  }

  console.log("\n--- Credenciales de Demostración para Clientes Potenciales ---");
  console.log(`Usuario:     ${username}`);
  console.log(`Contraseña:  ${password}`);
  console.log(`Rol:         Dueño / Administrador de Tienda (Acceso Total)`);
  console.log(`Empresa:     ${company.tradeName}`);
  console.log(`Sucursal:    ${branch.name}`);
}

main().catch((err) => {
  console.error("Error al crear usuario demo:", err);
  process.exit(1);
});
