/// <reference types="node" />
import { execSync } from "child_process";

export default async function setup() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      "[globalSetup] DATABASE_URL não definida. Pulando configuração de banco de teste."
    );
    console.warn(
      "[globalSetup] Para testes de integração, defina DATABASE_URL no .env.test"
    );
    return;
  }

  console.log(`[globalSetup] Configurando banco de teste...`);

  try {
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      cwd: process.cwd(),
      stdio: "pipe",
    });
    console.log(
      `[globalSetup] Migrations aplicadas com sucesso em: ${databaseUrl}`
    );
  } catch (error) {
    console.error("[globalSetup] Erro ao aplicar migrations:", error);
    throw error;
  }
}
