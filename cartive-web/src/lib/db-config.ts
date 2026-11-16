export type MysqlConnectionOptions = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  connectTimeout: number;
  ssl?: { rejectUnauthorized: true };
};

export function parseMysqlConnectionOptions(
  connectionString: string,
  options: { requireTls?: boolean; connectionLimit?: number } = {},
): MysqlConnectionOptions {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL bukan URL koneksi yang valid.");
  }

  if (url.protocol !== "mysql:" || !url.hostname || !url.username) {
    throw new Error("DATABASE_URL harus memakai skema mysql:// dan memiliki host serta user.");
  }

  const sslMode = url.searchParams.get("sslaccept");
  if (sslMode && sslMode !== "strict") {
    throw new Error("Koneksi database hanya menerima sslaccept=strict.");
  }
  if (options.requireTls && sslMode !== "strict") {
    throw new Error("Koneksi database produksi wajib memakai sslaccept=strict.");
  }

  const port = url.port ? Number(url.port) : 3306;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port DATABASE_URL tidak valid.");
  }

  const connectionLimit = options.connectionLimit ?? 4;
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 20) {
    throw new Error("DB_CONNECTION_LIMIT harus berupa angka 1 sampai 20.");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!database) throw new Error("Nama database belum dicantumkan di DATABASE_URL.");

  return {
    host: url.hostname,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit,
    connectTimeout: 5000,
    ...(sslMode === "strict" ? { ssl: { rejectUnauthorized: true as const } } : {}),
  };
}
