import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

describe("D1 authentication migration", () => {
  it("is discovered from the ordered top-level migration directory and creates guarded bootstrap tables", () => {
    const migrationsDirectory = join(process.cwd(), "migrations");
    const migrationName = "0003_workspace_auth.sql";

    expect(readdirSync(migrationsDirectory).sort()).toContain(migrationName);

    const database = new DatabaseSync(":memory:");
    try {
      database.exec(readFileSync(join(migrationsDirectory, migrationName), "utf8"));

      const tables = database.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('AppUser', 'AppSession', 'AppBootstrap') ORDER BY name",
      ).all() as Array<{ name: string }>;
      expect(tables.map((table) => table.name)).toEqual(["AppBootstrap", "AppSession", "AppUser"]);

      database.exec("INSERT INTO AppUser (id, username, passwordHash, role) VALUES ('u1', 'existing', 'hash', 'SUPER_ADMIN')");
      expect(() => database.exec("INSERT INTO AppBootstrap (id, ownerToken) VALUES ('first-super-admin', 'attempt')")).toThrow(
        "bootstrap requires empty AppUser table",
      );
    } finally {
      database.close();
    }
  });

  it("adds an enabled-by-default lifecycle state for every account", () => {
    const migrationsDirectory = join(process.cwd(), "migrations");
    const database = new DatabaseSync(":memory:");
    try {
      database.exec(readFileSync(join(migrationsDirectory, "0003_workspace_auth.sql"), "utf8"));
      database.exec(readFileSync(join(migrationsDirectory, "0010_account_lifecycle.sql"), "utf8"));
      database.exec("INSERT INTO AppUser (id, username, passwordHash, role, city, bdName) VALUES ('u1', 'bd-name', 'hash', 'BD', '玉林', 'BD姓名')");

      const user = database.prepare("SELECT isActive FROM AppUser WHERE id = 'u1'").get() as { isActive: number };
      expect(user.isActive).toBe(1);
    } finally {
      database.close();
    }
  });
});
