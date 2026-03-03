interface Props {
  endpoint: string;
  query?: Record<string, string>;
  wrappedByKey?: string;
  wrappedByList?: boolean;
}

/**
 * Fetches data from the Strapi API
 * @param endpoint - The endpoint to fetch from (e.g. 'services')
 * @param query - The query parameters to add to the URL
 * @param wrappedByKey - The key to unwrap the response from (e.g. 'data')
 * @param wrappedByList - If the response is a list, unwrap it deeply
 * @returns
 */
export default async function fetchApi<T>({
  endpoint,
  query,
  wrappedByKey,
  wrappedByList,
}: Props): Promise<T> {
  if (endpoint.startsWith('/')) {
    endpoint = endpoint.slice(1);
  }

  const strapiUrl = import.meta.env.PUBLIC_STRAPI_URL || 'http://localhost:1337';
  const url = new URL(`${strapiUrl}/api/${endpoint}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  try {
    const res = await fetch(url.toString());
    
    // Si no es un 200 OK, devolvemos null o array vacío según el tipo esperado,
    // pero para evitar crashes devolvemos null y dejamos que el llamador lo maneje
    if (!res.ok) {
        console.error(`Error fetching API: ${res.status} ${res.statusText}`);
        return [] as any; // Fallback seguro para listas
    }

    let data = await res.json();

    if (wrappedByKey) {
      data = data[wrappedByKey];
    }

    if (wrappedByList) {
      data = data[0];
    }
    
    // Si data es null o undefined, devolver array vacío para evitar crash de .length
    return (data || []) as T;

  } catch (error) {
    console.error("Fetch API error:", error);
    return [] as any;
  }
}
