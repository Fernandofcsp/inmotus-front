import { createSign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SHEET_ID = "1JYHtqZ0LKYN3MxOyOIMMQPYUWzJx7ONnkCpDZjp7f1U";
const DATA_DIR = path.join(process.cwd(), "src/data");

// Asegurar que la carpeta de datos exista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SERVICES_CACHE_PATH = path.join(DATA_DIR, "services.json");
const PHYSIOS_CACHE_PATH = path.join(DATA_DIR, "physiotherapists.json");

export interface Service {
  id: string;
  category: string;
  title: string;
  price: number;
}

export interface Physiotherapist {
  id: string;
  name: string;
  mail: string;
  age: string;
  phone_number: string;
  gender: string;
  profile_photo: string;
  full_photo_url: string;
  instagram: string;
  facebook: string;
  experience: string;
  certifications: string;
}

// Helpers para manejar caché local
function saveToCache(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error(`Error guardando caché en ${filePath}:`, e);
  }
}

function loadFromCache<T>(filePath: string): T[] {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error(`Error leyendo caché desde ${filePath}:`, e);
  }
  return [];
}

async function getAccessToken(): Promise<string | null> {
  const raw = import.meta.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn("GOOGLE_SERVICE_ACCOUNT_JSON no configurada");
    return null;
  }

  let creds: { client_email: string; private_key: string };
  try {
    creds = JSON.parse(raw);
  } catch {
    console.error("GOOGLE_SERVICE_ACCOUNT_JSON no es JSON válido");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const header = { alg: "RS256", typ: "JWT" };
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${encode(header)}.${encode(payload)}`;

  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign.sign(creds.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    const json = await res.json();
    return json.access_token ?? null;
  } catch (e) {
    console.error("Error obteniendo access token:", e);
    return null;
  }
}

export async function fetchServices(): Promise<Service[]> {
  const token = await getAccessToken();
  
  if (!token) {
    console.warn("Sin token de Google, cargando servicios desde caché local...");
    return loadFromCache<Service>(SERVICES_CACHE_PATH);
  }

  const range = "services_and_products!A2:H1000";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) {
      console.error(`Sheets API error: ${res.status}. Cargando caché local...`);
      return loadFromCache<Service>(SERVICES_CACHE_PATH);
    }

    const json = await res.json();
    const rows: string[][] = json.values ?? [];

    const services = rows
      .filter((row) => row[0]?.startsWith("SERV-") && row[3] && row[7]?.toUpperCase() !== "NO")
      .map((row) => ({
        id: row[0] ?? "",
        category: row[1] ?? "",
        title: row[2] ?? "",
        price: parseFloat(row[3]) || 0,
      }));

    if (services.length > 0) {
      saveToCache(SERVICES_CACHE_PATH, services);
    }
    
    return services.length > 0 ? services : loadFromCache<Service>(SERVICES_CACHE_PATH);
  } catch (e) {
    console.error("Error fetching Google Sheets, intentando caché local:", e);
    return loadFromCache<Service>(SERVICES_CACHE_PATH);
  }
}

export async function fetchPhysiotherapists(): Promise<Physiotherapist[]> {
  const token = await getAccessToken();
  
  if (!token) {
    console.warn("Sin token de Google, cargando fisioterapeutas desde caché local...");
    return loadFromCache<Physiotherapist>(PHYSIOS_CACHE_PATH);
  }

  const range = "Physiotherapist!A2:L1000";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error(`Sheets API error: ${res.status}. Cargando caché local...`);
      return loadFromCache<Physiotherapist>(PHYSIOS_CACHE_PATH);
    }

    const json = await res.json();
    const rows: string[][] = json.values ?? [];

    const physios = rows
      .map((row) => ({
        id: row[0] ?? "",
        name: row[1] ?? "",
        mail: row[2] ?? "",
        age: row[3] ?? "",
        phone_number: row[4] ?? "",
        gender: row[5] ?? "",
        profile_photo: row[6] ?? "",
        full_photo_url: row[7] ?? "",
        instagram: row[8] ?? "",
        facebook: row[9] ?? "",
        experience: row[10] ?? "",
        certifications: row[11] ?? "",
      }))
      .filter((p) => p.full_photo_url !== "" || p.profile_photo !== "");

    if (physios.length > 0) {
      saveToCache(PHYSIOS_CACHE_PATH, physios);
    }

    return physios.length > 0 ? physios : loadFromCache<Physiotherapist>(PHYSIOS_CACHE_PATH);
  } catch (e) {
    console.error("Error fetching Google Sheets Physiotherapists, intentando caché local:", e);
    return loadFromCache<Physiotherapist>(PHYSIOS_CACHE_PATH);
  }
}
