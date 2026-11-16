import { describe, expect, it } from "vitest";
import { parseMysqlConnectionOptions } from "./db-config";

describe("parseMysqlConnectionOptions", () => {
  it("membaca koneksi MySQL lokal tanpa TLS", () => {
    expect(
      parseMysqlConnectionOptions(
        "mysql://cartive:local%40password@127.0.0.1:3306/cartive",
      ),
    ).toEqual({
      host: "127.0.0.1",
      port: 3306,
      user: "cartive",
      password: "local@password",
      database: "cartive",
      connectionLimit: 4,
      connectTimeout: 5000,
    });
  });

  it("mengaktifkan TLS terverifikasi untuk TiDB Cloud", () => {
    const config = parseMysqlConnectionOptions(
      "mysql://user:password@gateway.tidbcloud.com:4000/cartive?sslaccept=strict",
      { requireTls: true, connectionLimit: 3 },
    );
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.port).toBe(4000);
    expect(config.connectionLimit).toBe(3);
  });

  it.each([
    ["skema Postgres", "postgresql://cartive@localhost/cartive"],
    ["TLS tanpa verifikasi", "mysql://cartive@db.example.com/cartive?sslaccept=accept_invalid_certs"],
    ["database kosong", "mysql://cartive@localhost/"],
  ])("menolak %s", (_label, connectionString) => {
    expect(() => parseMysqlConnectionOptions(connectionString)).toThrow();
  });

  it("mewajibkan TLS untuk koneksi produksi", () => {
    expect(() =>
      parseMysqlConnectionOptions("mysql://cartive@db.example.com/cartive", {
        requireTls: true,
      }),
    ).toThrow("wajib memakai sslaccept=strict");
  });
});
