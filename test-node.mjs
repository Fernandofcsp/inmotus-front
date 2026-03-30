import { createSign } from "node:crypto";
import fs from "node:fs";

const SHEET_ID = "1JYHtqZ0LKYN3MxOyOIMMQPYUWzJx7ONnkCpDZjp7f1U";

async function getAccessToken() {
  const envFile = fs.readFileSync(".env", "utf8");
  const match = envFile.match(/GOOGLE_SERVICE_ACCOUNT_JSON='([^']+)'/);
  if (!match) return null;
  const raw = match[1];
  const creds = JSON.parse(raw);

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

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json();
  return json.access_token;
}

async function run() {
  const token = await getAccessToken();
  const range = "Physiotherapist!A2:M1000";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  
  const rows = json.values ?? [];
  const physios = rows.map((row) => ({
    name: row[1] ?? "",
    profile_photo: row[6] ?? "",
    full_photo_url: row[7] ?? "",
  })).filter((p) => p.full_photo_url !== "" || p.profile_photo !== "");

  console.log(JSON.stringify(physios, null, 2));
}
run();
