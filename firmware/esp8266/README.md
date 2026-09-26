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
| Pulsador | Un terminal | D3 | 0 |
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

No mantengas presionado el pulsador conectado a D3 mientras enciendes o reinicias el NodeMCU, porque GPIO0 selecciona el modo de programación durante el arranque.

## Indicadores

- LED verde: existe una medición válida dentro del rango local.
- LED rojo: no se detecta la señal del sensor o la medición supera el rango permitido.
- LED azul: permanece encendido mientras el botón de calibración está presionado.
- Buzzer: un pitido al iniciar el tacómetro y dos pitidos al entrar en estado de alarma roja. Los dos pitidos no se repiten mientras continúe la misma alarma.

\* Prueba primero el módulo LCD alimentado a 3,3 V y ajusta su potenciómetro de contraste. Si tu adaptador I²C necesita 5 V, utiliza un conversor bidireccional de nivel lógico en SDA y SCL; no conectes directamente al ESP8266 unas líneas I²C elevadas a 5 V.

## Preparar Arduino IDE

1. Instala el soporte de placas ESP8266.
2. Selecciona **NodeMCU 1.0 (ESP-12E Module)**.
3. Instala `LiquidCrystal I2C`.
4. Instala `WebSockets` de Markus Sattler.
5. Instala `WiFiManager` de tzapu.
6. Abre `tacometro_esp8266/tacometro_esp8266.ino`.
7. Carga el programa y abre el monitor serie a 115200 baudios.

## Configurar el Wi-Fi

Las credenciales no se escriben en el programa. La primera vez que enciendas el tacómetro:

1. Conecta el teléfono o la computadora a la red **Tacometro-PIC-II**.
2. Usa la clave **tacometro123**.
3. Si la página no se abre sola, visita `http://192.168.4.1`.
4. Pulsa **Configure WiFi**, elige tu red e introduce su contraseña.

El ESP8266 guardará esos datos y se conectará automáticamente en los siguientes encendidos. Si el portal no recibe la configuración en tres minutos, el tacómetro continúa funcionando en modo local.

El monitor serie mostrará la IP. Para conectarlo al dashboard utiliza `ws://IP:81/`.

## Ajustes principales

- `PULSOS_POR_VUELTA`: cantidad de imanes o pulsos por cada vuelta completa.
- `RPM_MAXIMA_VALIDA`: límite superior de la medición válida.
- `HISTERESIS_RPM`: margen que evita cambios repetidos cerca del límite.
- `RPM_REFERENCIA_CALIBRACION`: velocidad real conocida usada al mantener pulsado el botón.
- `PERIODO_MEDICION_MS`: intervalo de cálculo y envío de datos.

El potenciómetro del KY-024 ajusta el umbral de su salida digital `DO`. Acerca el imán y ajústalo hasta que el indicador del módulo cambie de estado una sola vez por pasada.
