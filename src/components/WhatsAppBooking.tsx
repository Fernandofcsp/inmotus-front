import React from "react";

export default function WhatsAppBooking({ services = [], whatsappNumber = "" }: any) {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '10px', border: '2px solid blue' }}>
      <h2 style={{ color: 'blue' }}>¡EL COMPONENTE REACT ESTÁ FUNCIONANDO!</h2>
      <p>Servicios detectados: {services.length}</p>
      <p>WhatsApp: {whatsappNumber}</p>
      <div style={{ marginTop: '20px' }}>
        <input type="text" placeholder="Prueba de input" style={{ border: '1px solid #ccc', padding: '5px' }} />
        <button style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '5px' }}>
          Prueba de Botón
        </button>
      </div>
    </div>
  );
}
