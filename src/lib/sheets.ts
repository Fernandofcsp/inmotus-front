const SHEET_ID = "1JYHtqZ0LKYN3MxOyOIMMQPYUWzJx7ONnkCpDZjp7f1U";

export interface Service {
  id: string;
  category: string;
  title: string;
  price: number;
}

export async function fetchServices(): Promise<Service[]> {
  const apiKey = import.meta.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_SHEETS_API_KEY no configurada");
    return [];
  }

  const range = "services_and_products!A2:D1000";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Google Sheets API error: ${res.status} ${res.statusText}`);
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
