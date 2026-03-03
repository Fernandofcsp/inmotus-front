import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import fetchApi from '../../lib/strapi';

// Inicializar MercadoPago
const client = new MercadoPagoConfig({ 
  accessToken: import.meta.env.MP_ACCESS_TOKEN || 'TEST-000000-000000-000000', 
  options: { timeout: 5000 } 
});

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const data = await request.json();
    const { serviceTitle, servicePrice, email } = data;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requerido" }), { status: 400 });
    }

    // 1. Crear Orden en Strapi (Pending)
    // Usamos el cliente de Strapi que ya tenemos, o fetch directo
    // fetchApi espera GET, así que haremos un fetch directo POST
    let orderId = null;
    
    try {
        const strapiRes = await fetch(`${import.meta.env.PUBLIC_STRAPI_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: {
                    email: email,
                    amount: servicePrice,
                    status: 'pending',
                    service_name: serviceTitle
                }
            })
        });
        
        const orderData = await strapiRes.json();
        if (orderData.data) {
            orderId = orderData.data.id || orderData.data.documentId;
        }
    } catch (dbError) {
        console.error("Error creando orden en Strapi:", dbError);
        // Continuamos igual para no bloquear el pago, pero es riesgo
    }

    // 2. Crear Preferencia en MercadoPago
    const preference = new Preference(client);
    
    // URL base dinámica
    const origin = new URL(request.url).origin;

    const result = await preference.create({
      body: {
        items: [
          {
            id: orderId ? orderId.toString() : 'temp-id',
            title: serviceTitle,
            quantity: 1,
            unit_price: Number(servicePrice),
          },
        ],
        payer: {
            email: email
        },
        back_urls: {
          success: `${origin}/citas?payment_status=approved&order_id=${orderId}`,
          failure: `${origin}/checkout?status=failure`,
          pending: `${origin}/checkout?status=pending`,
        },
        auto_return: "approved",
        external_reference: orderId ? orderId.toString() : undefined,
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
