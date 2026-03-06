import { TypeAnimation } from 'react-type-animation';

interface TypewriterProps {
  className?: string;
}

export default function Typewriter({ className }: TypewriterProps) {
  return (
    <TypeAnimation
      sequence={[
        'Recupera tu movimiento.',
        2000,
        'Moverse es vida.',
        2000,
        'Vuelve a lo que más amas.',
        2000,
        'Bienestar que se siente.',
        2000,
        'Mejora tu vida.',
        2000,
        'No dejes que el dolor te detenga.',
        2000,
        'Restaura el equilibrio de tu cuerpo.',
        2000
      ]}
      wrapper="span"
      cursor={false}
      speed={40}
      className={className}
      repeat={Infinity}
      style={{
        display: "inline",
      }}
    />
  );
}
