# Firmware ESP32

Firmware del prototipo final para ESP32 DevKit V1 de 30 pines, sensor Hall KY-024, pantalla LCD 16×2 I²C, tres LED, buzzer y pulsador de calibración.

## Conexiones

| Elemento | Conexión ESP32 |
|---|---:|
| KY-024 DO | GPIO27 |
| KY-024 VCC | 3,3 V |
| KY-024 GND | GND |
| LCD SDA | GPIO21 |
| LCD SCL | GPIO22 |
| LED rojo | GPIO25 |
| LED azul | GPIO26 |
| LED verde | GPIO33 |
| Buzzer | GPIO18 |
| Pulsador CAL | GPIO13 a GND |

Los LED utilizan resistencias de 220 Ω en serie. El buzzer debe gobernarse mediante una etapa de accionamiento adecuada a su consumo. Todos los módulos comparten la misma referencia de masa.

La pantalla utilizada se alimenta a 5 V. Antes de conectar otra pantalla, se debe comprobar la tensión de las resistencias de subida del adaptador I²C y utilizar un conversor bidireccional si las líneas SDA y SCL quedan elevadas a 5 V.

## Preparación de Arduino IDE

1. Instalar el soporte de placas ESP32 de Espressif Systems.
2. Seleccionar una placa compatible con ESP32 DevKit V1.
3. Instalar `LiquidCrystal I2C`.
4. Instalar `WebSockets` de Markus Sattler.
5. Instalar `WiFiManager` de tzapu.
6. Abrir `tacometro_esp32/tacometro_esp32.ino`.
7. Compilar, cargar el programa y abrir el monitor serie a 115200 baudios.

## Configuración Wi-Fi

Si no hay credenciales guardadas, el equipo crea el portal `Tacometro-PIC-II`. La configuración se realiza desde `http://192.168.4.1`. Si el portal vence, el tacómetro continúa funcionando en modo local.

Cuando el ESP32 se conecta a la red, el monitor serie muestra su dirección IP. El dashboard se conecta mediante `ws://IP_DEL_ESP32:81/`.

## Parámetros principales

- `PULSOS_POR_VUELTA = 1`.
- `RPM_MAXIMA_VALIDA = 4500`.
- `HISTERESIS_RPM = 100`.
- `RPM_REFERENCIA_CALIBRACION = 1500`.
- `PERIODO_MEDICION_MS = 1000`.
- `TIEMPO_SIN_SENAL_MS = 2500`.
- `CANTIDAD_MUESTRAS = 5`.

El potenciómetro del KY-024 ajusta el umbral de la salida digital. La posición del sensor y la distancia al imán deben regularse hasta obtener una sola conmutación por revolución.
