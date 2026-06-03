import { useState } from 'react';

const PreguntasFrecuentes = () => {
  const [preguntaAbierta, setPreguntaAbierta] = useState<number | null>(null);

  const alternarPregunta = (indice: number) => {
    if (preguntaAbierta === indice) {
      setPreguntaAbierta(null);
    } else {
      setPreguntaAbierta(indice);
    }
  };

  const listaFaqs = [
    {
      pregunta: "¿Cómo funciona el Tótem de Acceso?",
      respuesta: "El tótem se configura en una pantalla o tablet dedicada en la entrada de tu gimnasio. Tus socios ingresan su número de PIN personal (los 6 primeros dígitos de su documento de identidad). El sistema valida si su membresía está activa y registra su entrada al instante."
    },
    {
      pregunta: "¿El software requiere conexión a Internet constante?",
      respuesta: "Sí, GymPross es una plataforma SaaS en la nube (conectada a Supabase), lo que asegura que todos los datos estén siempre sincronizados y accesibles en tiempo real desde cualquier dispositivo."
    },
    {
      pregunta: "¿Cómo puedo dar de alta mi gimnasio en la plataforma?",
      respuesta: "Actualmente las altas de nuevos gimnasios se realizan de forma coordinada con nuestro SuperAdmin. Haz clic en el botón 'Adquirir Software' en la sección superior para contactarnos directamente vía WhatsApp y gestionar tu cuenta de forma inmediata."
    },
    {
      pregunta: "¿Qué formas de pago soporta el registro de recepción?",
      respuesta: "La recepcionista puede registrar pagos tanto en efectivo como a través de códigos QR estáticos, permitiendo llevar un flujo de caja diario transparente y estructurado."
    }
  ];

  return (
    <section id="preguntas" className="py-24 px-4 md:px-12 bg-black relative">
      {/* Luces decorativas */}
      <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] rounded-full bg-brand-red/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-[800px] mx-auto text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-red">F.A.Q.</span>
        <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-16">
          Preguntas Frecuentes
        </h2>

        <div className="space-y-4">
          {listaFaqs.map((faq, indice) => {
            const estaAbierta = preguntaAbierta === indice;
            return (
              <div 
                key={indice}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-brand-red/30"
              >
                <button
                  onClick={() => alternarPregunta(indice)}
                  className="w-full py-6 px-8 flex justify-between items-center text-left focus:outline-none cursor-pointer"
                >
                  <span className="font-bold text-white text-base md:text-lg group-hover:text-brand-red">
                    {faq.pregunta}
                  </span>
                  <span className="text-brand-red font-bold text-xl ml-4">
                    {estaAbierta ? '−' : '+'}
                  </span>
                </button>
                
                {estaAbierta && (
                  <div className="px-8 pb-6 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4 text-left animate-fade-in">
                    {faq.respuesta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PreguntasFrecuentes;
