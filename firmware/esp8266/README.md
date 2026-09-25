# Firmware del circuito físico

Código para **NodeMCU ESP8266 ESP-12E/ESP-12F**, sensor Hall **KY-024**, LCD 16×2 I²C, tres LED, buzzer y pulsador de calibración.

## Conexiones

| Elemento | Pin del módulo | NodeMCU | GPIO |
|---|---|---:|---:|
| LCD I²C | SCL | D1 | 5 |
| LCD I²C | SDA | D2 | 4 |
| LCD I²C | VCC | 3V3* | — |
| LCD I²C | GND | GND | — |
| KY-024 | DO | D5 | 14 |
| KY-024 | + | 3V3 | — |
| KY-024 | G | GND | — |
| KY-024 | AO | Sin conectar | — |
| LED rojo | Resistencia 220 Ω → ánodo | D6 | 12 |
| LED azul | Resistencia 220 Ω → ánodo | D7 | 13 |
| LED verde | Resistencia 220 Ω → ánodo | D0 | 16 |
| Todos los LED | Cátodo | GND | — |
| Buzzer | Control | D8 | 15 |
| Pulsador | Un terminal | RX | 3 |
| Pulsador | Otro terminal | GND | — |

### Buzzer recomendado

No alimentes un buzzer de consumo elevado directamente desde el NodeMCU. Usa un transistor NPN:

- D8 → resistencia de 1 kΩ → base del transistor.
- Emisor → GND.
- Colector → negativo del buzzer.
- Positivo del buzzer → alimentación apropiada.
- Une la masa de la alimentación con GND del NodeMCU.
- Si el buzzer es electromagnético, coloca un diodo de protección en paralelo.

Mantén D8 en nivel bajo durante el arranque, porque GPIO15 es un pin de arranque del ESP8266.

\* Prueba primero el módulo LCD alimentado a 3,3 V y ajusta su potenciómetro de contraste. Si tu adaptador I²C necesita 5 V, utiliza un conversor bidireccional de nivel lógico en SDA y SCL; no conectes directamente al ESP8266 unas líneas I²C elevadas a 5 V.

## Preparar Arduino IDE

1. Instala el soporte de placas ESP8266.
2. Selecciona **NodeMCU 1.0 (ESP-12E Module)**.
3. Instala `LiquidCrystal I2C`.
4. Instala `WebSockets` de Markus Sattler.
5. Abre `tacometro_esp8266/tacometro_esp8266.ino`.
6. Escribe el nombre y la contraseña de tu Wi-Fi.
7. Carga el programa y abre el monitor serie a 115200 baudios.

El monitor serie mostrará la IP. Para conectarlo al dashboard utiliza `ws://IP:81/`.

## Ajustes principales

- `PULSOS_POR_VUELTA`: cantidad de imanes o pulsos por cada vuelta completa.
- `RPM_BAJA_MAX`, `RPM_NORMAL_MAX` y `RPM_ALTA_MAX`: límites usados por los LED y el buzzer.
- `RPM_REFERENCIA_CALIBRACION`: velocidad real conocida usada al mantener pulsado el botón.
- `PERIODO_MEDICION_MS`: intervalo de cálculo y envío de datos.

El potenciómetro del KY-024 ajusta el umbral de su salida digital `DO`. Acerca el imán y ajústalo hasta que el indicador del módulo cambie de estado una sola vez por pasada.
