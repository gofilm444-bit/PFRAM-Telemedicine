import { copyFile, access, readFile, writeFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const environmentFile = resolve(root, ".env");
const exampleFile = resolve(root, ".env.example");

try {
  await access(environmentFile, constants.F_OK);
  console.log("Environment development tersedia.");
} catch {
  await copyFile(exampleFile, environmentFile);
  console.log(
    "Membuat .env dari .env.example (development only, tidak akan di-commit).",
  );
}

const legacyDatabaseUrls = [
  "DATABASE_URL=postgresql://pfram:pfram_dev_only@localhost:5432/pfram_db?schema=public",
  "DATABASE_URL=postgresql://pfram:pfram_dev_only@localhost:55432/pfram_db?schema=public",
];
const developmentDatabaseUrl =
  "DATABASE_URL=postgresql://pfram:pfram_dev_only@localhost:5433/pfram_db?schema=public";
let environmentContents = await readFile(environmentFile, "utf8");
const legacyDatabaseUrl = legacyDatabaseUrls.find((candidate) =>
  environmentContents.includes(candidate),
);
if (legacyDatabaseUrl) {
  environmentContents = environmentContents.replace(
    legacyDatabaseUrl,
    developmentDatabaseUrl,
  );
  if (!/^POSTGRES_PORT=/m.test(environmentContents)) {
    environmentContents = environmentContents.replace(
      developmentDatabaseUrl,
      `${developmentDatabaseUrl}\nPOSTGRES_PORT=5433`,
    );
  } else {
    environmentContents = environmentContents.replace(
      /^POSTGRES_PORT=(?:5432|55432)$/m,
      "POSTGRES_PORT=5433",
    );
  }
  await writeFile(environmentFile, environmentContents, "utf8");
  console.log(
    "Environment development diperbarui ke port PostgreSQL PFRAM 5433.",
  );
}

console.log(
  "Menyiapkan PostgreSQL, MinIO, migration, seed, API, web, dan mobile...",
);

function dockerIsReady() {
  const check = spawnSync(
    "docker",
    ["info", "--format", "{{.ServerVersion}}"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
      timeout: 8_000,
      windowsHide: true,
    },
  );
  return check.status === 0 && check.stdout.trim().length > 0;
}

async function waitForDocker(timeoutMs = 120_000) {
  const startedAt = Date.now();
  let lastUpdate = 0;
  while (Date.now() - startedAt < timeoutMs) {
    if (dockerIsReady()) return true;
    if (Date.now() - lastUpdate >= 5_000) {
      console.log("Menunggu Docker Linux engine siap...");
      lastUpdate = Date.now();
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
  }
  return false;
}

if (!dockerIsReady()) {
  if (process.platform !== "win32") {
    throw new Error(
      "Docker engine belum aktif. Jalankan Docker, lalu ulangi npm run dev.",
    );
  }

  console.log("Docker engine belum aktif. Menyalakan Docker Desktop...");
  const desktopStart = spawnSync("docker", ["desktop", "start"], {
    encoding: "utf8",
    shell: true,
    timeout: 30_000,
    windowsHide: true,
  });

  if (desktopStart.status !== 0) {
    const desktopExecutable =
      "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
    if (!existsSync(desktopExecutable)) {
      throw new Error(
        "Docker Desktop tidak ditemukan. Instal Docker Desktop dan aktifkan Linux containers.",
      );
    }
    const desktop = spawn(desktopExecutable, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    desktop.unref();
  }

  if (!(await waitForDocker())) {
    throw new Error(
      "Docker Desktop belum siap setelah 120 detik. Buka Docker Desktop, pastikan status Engine running dan mode Linux containers aktif, lalu ulangi npm run dev.",
    );
  }
}

console.log("Docker engine siap.");
