import { createSign } from "crypto";

const SHEET_ID = "1JYHtqZ0LKYN3MxOyOIMMQPYUWzJx7ONnkCpDZjp7f1U";

export interface Service {
  id: string;
  category: string;
  title: string;
  price: number;
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
  if (!token) return [];

  const range = "services_and_products!A2:D1000";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error(`Sheets API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const json = await res.json();
    const rows: string[][] = json.values ?? [];

    return rows
      .filter((row) => row[0]?.startsWith("SERV-") && row[3])
      .map((row) => ({
        id: row[0] ?? "",
        category: row[1] ?? "",
        title: row[2] ?? "",
        price: parseFloat(row[3]) || 0,
      }));
  } catch (e) {
    console.error("Error fetching Google Sheets:", e);
    return [];
  }
}
