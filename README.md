# Tacómetro digital PIC II

Proyecto de tacómetro portátil para medir sin contacto la velocidad de rotación de un eje. El prototipo final utiliza un ESP32 DevKit V1, un sensor Hall KY-024, una pantalla LCD 16×2, indicadores luminosos, buzzer y comunicación Wi-Fi.

## Funciones principales

- Conteo por interrupciones con un pulso por revolución.
- Cálculo de RPM cada segundo y promedio móvil de cinco muestras.
- Calibración a 1500 RPM con almacenamiento en EEPROM.
- Detección de pérdida de señal.
- Indicadores mediante LCD, tres LED y buzzer.
- Configuración de Wi-Fi mediante portal cautivo.
- Envío de lecturas JSON por WebSocket en el puerto 81.
- Dashboard con históricos, estadísticas y rangos configurables.

## Organización

```text
.
├── firmware/
│   ├── esp32/                   Firmware del prototipo final
│   │   └── tacometro_esp32/
│   │       └── tacometro_esp32.ino
│   └── esp8266/                 Versión anterior para NodeMCU
│       └── tacometro_esp8266/
│           └── tacometro_esp8266.ino
└── web/                         Dashboard y servidor local
```

Las conexiones y la preparación del entorno están detalladas en [`firmware/esp32/README.md`](firmware/esp32/README.md). La carpeta `firmware/esp8266` se conserva como referencia de la etapa anterior.

## Dashboard

Requiere Node.js 18 o posterior.

```bash
cd web
npm install
npm run dev
```

El dashboard queda disponible en `http://127.0.0.1:4173/`. Para conectar el prototipo se utiliza una dirección WebSocket con el formato `ws://IP_DEL_ESP32:81/`.
