import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicializar MercadoPago
const client = new MercadoPagoConfig({ 
  accessToken: import.meta.env.MP_ACCESS_TOKEN || 'TEST-000000-000000-000000', 
  options: { timeout: 5000 } 
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { serviceTitle, servicePrice, email } = data;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requerido" }), { status: 400 });
    }

    // Crear Preferencia en MercadoPago
    const preference = new Preference(client);
    const origin = new URL(request.url).origin;

    const result = await preference.create({
      body: {
        items: [
          {
            id: 'service',
            title: serviceTitle,
            quantity: 1,
            unit_price: Number(servicePrice),
          },
        ],
        payer: { email },
        back_urls: {
          success: `${origin}/citas?payment_status=approved`,
          failure: `${origin}/checkout?status=failure`,
          pending: `${origin}/checkout?status=pending`,
        },
        auto_return: "approved",
      },
    });

    return new Response(JSON.stringify({ id: result.id }), { status: 200 });

  } catch (error) {
    console.error("Error MercadoPago:", error);
    
    // FALLBACK PARA MODO DEMO/DESARROLLO
    // Si fallan las credenciales (común en dev), devolvemos un ID falso para que el frontend no explote
    // y el usuario pueda ver "algo" (aunque el botón de MP fallará al inicializar, pero validamos la llamada).
    if (import.meta.env.DEV) {
        return new Response(JSON.stringify({ 
            id: 'preference_mock_123', 
            message: 'MODO DEMO: Preferencia simulada (Credenciales MP inválidas)' 
        }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Error creando preferencia" }), { status: 500 });
  }
};
