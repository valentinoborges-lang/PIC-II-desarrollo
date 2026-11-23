# Dashboard web

Dashboard en HTML, CSS y JavaScript para visualizar RPM en tiempo real.

## Ejecutar localmente

Necesitas Node.js 18 o posterior.

```bash
npm run dev
```

Abre `http://127.0.0.1:4173/`. El servidor local sustituye automáticamente el origen usado en las etiquetas sociales.

## Compilar

```bash
npm run build
```

El resultado queda en `dist/`.

## Conectar el circuito

1. Conecta la computadora y el ESP32 a la misma red Wi-Fi.
2. Lee en el monitor serie la dirección IP asignada al ESP32.
3. Pulsa **Conectar dispositivo** en el dashboard.
4. Usa `ws://IP_DEL_ESP32:81/`.

El firmware incluido transmite un mensaje JSON por segundo. El dashboard también ofrece modo demo, rangos de RPM editables y selección del período de muestreo de la gráfica.
