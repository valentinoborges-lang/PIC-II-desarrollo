# Tacómetro Digital PIC II — desarrollo organizado

Este repositorio reorganiza un proyecto existente en tres hitos técnicos verificables. Las fechas de los commits corresponden a esta reconstrucción y no al comienzo original del proyecto.

## Hitos completados

### Hito 1 — Dashboard básico

- Lectura de RPM simulada.
- Indicador visual del rango de funcionamiento.
- Servidor HTTP local sin dependencias externas.

### Hito 2 — Dashboard de monitoreo completo

- Históricos y estadísticas por sensor.
- Rangos de RPM editables.
- Período de muestreo configurable.
- Varias conexiones WebSocket simultáneas.
- Mensajes JSON compatibles con ESP8266 y ESP32.
- Proceso de construcción para publicación.

Para ejecutarlo:

```bash
cd web
npm run dev
```

Abre `http://127.0.0.1:4173/`.

Para conectar un dispositivo usa una dirección como `ws://192.168.1.105:81/`.
