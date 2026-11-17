import { describe, expect, it } from "vitest";
import { parseMysqlConnectionOptions, resolveDatabaseUrl } from "./db-config";

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

describe("resolveDatabaseUrl", () => {
  it("mengutamakan variabel terpisah untuk membangun koneksi TiDB TLS", () => {
    const connectionString = resolveDatabaseUrl(
      {
        DATABASE_URL: "mysql://stale@old.example.com/old",
        DB_HOST: "gateway.tidbcloud.com",
        DB_PORT: "4000",
        DB_USERNAME: "cartive-user",
        DB_PASSWORD: "password@with:reserved/chars",
        DB_DATABASE: "cartive_staging",
      },
      { requireTls: true },
    );

    expect(parseMysqlConnectionOptions(connectionString, { requireTls: true })).toMatchObject({
      host: "gateway.tidbcloud.com",
      port: 4000,
      user: "cartive-user",
      password: "password@with:reserved/chars",
      database: "cartive_staging",
      ssl: { rejectUnauthorized: true },
    });
  });

  it("menggunakan DATABASE_URL jika konfigurasi variabel terpisah tidak lengkap", () => {
    const connectionString = "mysql://cartive@db.example.com/cartive";
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: connectionString,
        DB_HOST: "db.example.com",
      }),
    ).toBe(connectionString);
  });

  it("menolak jika tidak ada konfigurasi koneksi yang lengkap", () => {
    expect(() => resolveDatabaseUrl({ DB_HOST: "db.example.com" })).toThrow(
      "Atur DATABASE_URL atau lengkapi DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, dan DB_DATABASE.",
    );
  });

  it("menolak port variabel yang tidak valid", () => {
    expect(() =>
      resolveDatabaseUrl({
        DB_HOST: "db.example.com",
        DB_PORT: "not-a-port",
        DB_USERNAME: "cartive",
        DB_PASSWORD: "password",
        DB_DATABASE: "cartive",
      }),
    ).toThrow("DB_PORT harus berupa angka antara 1 sampai 65535.");
  });
});
