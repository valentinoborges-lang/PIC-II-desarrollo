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

### Hito 3 — Circuito físico y comunicación

- Firmware para NodeMCU ESP8266 ESP-12E/ESP-12F.
- Lectura por interrupciones del sensor Hall KY-024.
- LCD 16×2 mediante I²C.
- LED verde, azul y rojo según las RPM.
- Buzzer para el rango peligroso.
- Pulsador de calibración y almacenamiento en EEPROM.
- Servidor WebSocket en el puerto 81.

## Organización final

```text
.
├── web/                         Dashboard y servidor local
└── firmware/esp8266/            Circuito físico
    └── tacometro_esp8266/
        └── tacometro_esp8266.ino
```

Para ejecutarlo:

```bash
cd web
npm run dev
```

Abre `http://127.0.0.1:4173/`.

Para conectar un dispositivo usa una dirección como `ws://192.168.1.105:81/`.

Las conexiones del circuito y la preparación de Arduino IDE están explicadas en [`firmware/esp8266/README.md`](firmware/esp8266/README.md).
