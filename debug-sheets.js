import { createSign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Manual dotenv loading that handles the multiline JSON
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  // Look for GOOGLE_SERVICE_ACCOUNT_JSON specifically as a multiline blob
  const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_JSON\s*=\s*'([\s\S]*?)'/);
  if (match) {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = match[1];
  }
  
  // Load others
  envContent.split("\n").forEach(line => {
    if (!line.includes("GOOGLE_SERVICE_ACCOUNT_JSON")) {
      const [key, ...vals] = line.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

const SHEET_ID = "1JYHtqZ0LKYN3MxOyOIMMQPYUWzJx7ONnkCpDZjp7f1U";

async function getAccessToken() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.error("GOOGLE_SERVICE_ACCOUNT_JSON no configurada");
    return null;
  }

  let creds;
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
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
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

async function testRange(range) {
  const token = await getAccessToken();
  if (!token) return;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`;
  console.log(`\nProbando rango: ${range}`);
  
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const json = await res.json();
    if (!res.ok) {
      console.error(`Error ${res.status}:`, JSON.stringify(json, null, 2));
    } else {
      console.log(`Éxito! Encontradas ${json.values?.length || 0} filas.`);
    }
  } catch (e) {
    console.error("Error de red:", e);
  }
}

async function run() {
  await testRange("services_and_products!A2:I10");
  await testRange("Physiotherapist!A2:M10");
  await testRange("freq_ask!A2:B10");
}

run();
