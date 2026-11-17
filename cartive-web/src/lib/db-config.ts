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

export function resolveDatabaseUrl(
  environment: Record<string, string | undefined>,
  options: { requireTls?: boolean } = {},
) {
  const componentNames = [
    "DB_HOST",
    "DB_PORT",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_DATABASE",
  ] as const;
  const hasAllComponents = componentNames.every((name) => environment[name]?.trim());

  if (!hasAllComponents) {
    const connectionString = environment.DATABASE_URL?.trim();
    if (connectionString) return connectionString;

    throw new Error(
      "Atur DATABASE_URL atau lengkapi DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, dan DB_DATABASE.",
    );
  }

  const port = Number(environment.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT harus berupa angka antara 1 sampai 65535.");
  }

  const url = new URL("mysql://localhost");
  url.hostname = environment.DB_HOST!.trim();
  url.port = String(port);
  url.username = environment.DB_USERNAME!.trim();
  url.password = environment.DB_PASSWORD!;
  url.pathname = `/${encodeURIComponent(environment.DB_DATABASE!.trim())}`;
  if (options.requireTls) url.searchParams.set("sslaccept", "strict");

  return url.toString();
}

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
    throw new Error("Koneksi database harus memakai skema mysql:// dan memiliki host serta user.");
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
    throw new Error("Port koneksi database tidak valid.");
  }

  const connectionLimit = options.connectionLimit ?? 4;
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 20) {
    throw new Error("DB_CONNECTION_LIMIT harus berupa angka 1 sampai 20.");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!database) throw new Error("Nama database belum dicantumkan pada konfigurasi koneksi.");

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
