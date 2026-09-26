#include <Arduino.h>
#include <EEPROM.h>
#include <ESP8266WiFi.h>
#include <LiquidCrystal_I2C.h>
#include <WebSocketsServer.h>
#include <WiFiManager.h>
#include <Wire.h>

// -----------------------------------------------------------------------------
// Identificación del equipo y portal de configuración Wi-Fi
// -----------------------------------------------------------------------------
const char* PORTAL_WIFI_NOMBRE = "Tacometro-PIC-II";
const char* PORTAL_WIFI_CLAVE = "tacometro123";
constexpr unsigned long PORTAL_WIFI_TIMEOUT_S = 180;

const char* DEVICE_ID = "ESP8266-01";
const char* SENSOR_ID = "M1";
const char* SENSOR_NAME = "Motor principal";

// Cambia este valor si usas más de un imán por vuelta.
constexpr float PULSOS_POR_VUELTA = 1.0f;

// Rango local de medicion. Una lectura con senal entre 0 y este limite es valida.
constexpr float RPM_MAXIMA_VALIDA = 3500.0f;
constexpr float HISTERESIS_RPM = 100.0f;

// Debe coincidir con la velocidad real usada durante la calibración.
constexpr float RPM_REFERENCIA_CALIBRACION = 1500.0f;

// -----------------------------------------------------------------------------
// Pines para NodeMCU ESP8266
// -----------------------------------------------------------------------------
constexpr uint8_t PIN_SENSOR_DO = D5;  // GPIO14 - salida digital del KY-024
constexpr uint8_t PIN_LED_ROJO = D6;   // GPIO12
constexpr uint8_t PIN_LED_AZUL = D7;   // GPIO13
constexpr uint8_t PIN_LED_VERDE = D0;  // GPIO16
constexpr uint8_t PIN_BUZZER = D8;     // GPIO15 - mantener LOW durante el arranque
constexpr uint8_t PIN_BOTON_CAL = D3;  // GPIO0 - pulsador hacia GND

constexpr uint8_t LCD_DIRECCION = 0x27;
constexpr uint8_t WEBSOCKET_PUERTO = 81;
constexpr unsigned long PERIODO_MEDICION_MS = 1000;
constexpr unsigned long TIEMPO_SIN_SENAL_MS = 2500;
constexpr unsigned long TIEMPO_PULSACION_CAL_MS = 1500;
constexpr unsigned long ANTIRREBOTE_BOTON_MS = 40;
constexpr unsigned long DURACION_PITIDO_MS = 170;
constexpr unsigned long PAUSA_PITIDO_MS = 140;
constexpr size_t CANTIDAD_MUESTRAS = 5;

LiquidCrystal_I2C lcd(LCD_DIRECCION, 16, 2);
WebSocketsServer webSocket(WEBSOCKET_PUERTO);

volatile uint32_t contadorPulsos = 0;
volatile unsigned long ultimoPulsoUs = 0;

float historialRpm[CANTIDAD_MUESTRAS] = {0};
size_t indiceHistorial = 0;
size_t muestrasDisponibles = 0;
float factorCalibracion = 1.0f;
float rpmActual = 0.0f;

unsigned long ultimaMedicionMs = 0;
unsigned long ultimoPulsoDetectadoMs = 0;
unsigned long inicioMedicionMs = 0;
unsigned long inicioPulsacionMs = 0;
unsigned long ultimoCambioBotonMs = 0;
bool calibracionSolicitada = false;
bool modoCalibracionActivo = false;
bool websocketIniciado = false;
bool evaluacionRangoHabilitada = false;
bool sensorSinSenal = true;
bool alarmaFueraDeRangoActiva = false;
bool lecturaBotonAnterior = HIGH;
bool estadoBotonEstable = HIGH;

enum EstadoBuzzer : uint8_t {
  BUZZER_REPOSO,
  BUZZER_SONANDO,
  BUZZER_PAUSA
};

EstadoBuzzer estadoBuzzer = BUZZER_REPOSO;
uint8_t pitidosRestantes = 0;
unsigned long cambioEstadoBuzzerMs = 0;

constexpr uint32_t EEPROM_MAGIC = 0x54414348;  // "TACH"
constexpr size_t EEPROM_TAMANO = 64;

struct ConfiguracionPersistente {
  uint32_t magic;
  float factor;
};

void ICACHE_RAM_ATTR registrarPulso() {
  const unsigned long ahoraUs = micros();

  // Rechaza rebotes o ruido más rápido que 1 ms.
  if (ahoraUs - ultimoPulsoUs >= 1000) {
    contadorPulsos++;
    ultimoPulsoUs = ahoraUs;
  }
}

void escribirLineaLcd(uint8_t fila, const String& texto) {
  String linea = texto;
  while (linea.length() < 16) linea += ' ';
  if (linea.length() > 16) linea.remove(16);
  lcd.setCursor(0, fila);
  lcd.print(linea);
}

void cargarCalibracion() {
  EEPROM.begin(EEPROM_TAMANO);

  ConfiguracionPersistente configuracion;
  EEPROM.get(0, configuracion);

  if (configuracion.magic == EEPROM_MAGIC
      && isfinite(configuracion.factor)
      && configuracion.factor >= 0.1f
      && configuracion.factor <= 10.0f) {
    factorCalibracion = configuracion.factor;
  }
}

void guardarCalibracion() {
  const ConfiguracionPersistente configuracion = {
    EEPROM_MAGIC,
    factorCalibracion
  };

  EEPROM.put(0, configuracion);
  EEPROM.commit();
}

void emitirPitidoInicial() {
  tone(PIN_BUZZER, 2200);
  delay(DURACION_PITIDO_MS);
  noTone(PIN_BUZZER);
  digitalWrite(PIN_BUZZER, LOW);
}

void iniciarSecuenciaBuzzer(uint8_t cantidad) {
  if (cantidad == 0) return;

  pitidosRestantes = cantidad;
  estadoBuzzer = BUZZER_SONANDO;
  cambioEstadoBuzzerMs = millis();
  tone(PIN_BUZZER, 2200);
}

void actualizarSecuenciaBuzzer() {
  const unsigned long ahoraMs = millis();

  if (estadoBuzzer == BUZZER_SONANDO
      && ahoraMs - cambioEstadoBuzzerMs >= DURACION_PITIDO_MS) {
    noTone(PIN_BUZZER);
    digitalWrite(PIN_BUZZER, LOW);
    pitidosRestantes--;
    cambioEstadoBuzzerMs = ahoraMs;
    estadoBuzzer = pitidosRestantes > 0 ? BUZZER_PAUSA : BUZZER_REPOSO;
  } else if (estadoBuzzer == BUZZER_PAUSA
             && ahoraMs - cambioEstadoBuzzerMs >= PAUSA_PITIDO_MS) {
    tone(PIN_BUZZER, 2200);
    cambioEstadoBuzzerMs = ahoraMs;
    estadoBuzzer = BUZZER_SONANDO;
  }
}

void actualizarIndicadores() {
  bool verde = false;
  bool azul = false;
  bool rojo = false;

  if (modoCalibracionActivo) {
    azul = true;
  } else if (evaluacionRangoHabilitada) {
    bool fueraDeRango = sensorSinSenal;

    if (!fueraDeRango) {
      const float limiteRetorno = RPM_MAXIMA_VALIDA - HISTERESIS_RPM;
      fueraDeRango = alarmaFueraDeRangoActiva
        ? rpmActual > limiteRetorno
        : rpmActual > RPM_MAXIMA_VALIDA;
    }

    verde = !fueraDeRango;
    rojo = fueraDeRango;

    if (fueraDeRango && !alarmaFueraDeRangoActiva) {
      iniciarSecuenciaBuzzer(2);
    }

    alarmaFueraDeRangoActiva = fueraDeRango;
  }

  digitalWrite(PIN_LED_VERDE, verde ? HIGH : LOW);
  digitalWrite(PIN_LED_AZUL, azul ? HIGH : LOW);
  digitalWrite(PIN_LED_ROJO, rojo ? HIGH : LOW);
}

float agregarAlPromedio(float rpm) {
  historialRpm[indiceHistorial] = rpm;
  indiceHistorial = (indiceHistorial + 1) % CANTIDAD_MUESTRAS;

  if (muestrasDisponibles < CANTIDAD_MUESTRAS) muestrasDisponibles++;

  float suma = 0.0f;
  for (size_t i = 0; i < muestrasDisponibles; i++) {
    suma += historialRpm[i];
  }

  return suma / muestrasDisponibles;
}

void enviarRpm(float rpm) {
  if (!websocketIniciado) return;

  String mensaje = "{\"device\":\"";
  mensaje += DEVICE_ID;
  mensaje += "\",\"sensor\":\"";
  mensaje += SENSOR_ID;
  mensaje += "\",\"name\":\"";
  mensaje += SENSOR_NAME;
  mensaje += "\",\"rpm\":";
  mensaje += String(rpm, 0);
  mensaje += "}";

  webSocket.broadcastTXT(mensaje);
}

void mostrarRpm(float rpm) {
  escribirLineaLcd(0, "RPM: " + String(rpm, 0));

  if (modoCalibracionActivo) {
    escribirLineaLcd(1, "CALIBRANDO...");
  } else if (!evaluacionRangoHabilitada) {
    escribirLineaLcd(1, "Esperando sensor");
  } else if (sensorSinSenal) {
    escribirLineaLcd(1, "SIN SENAL");
  } else if (alarmaFueraDeRangoActiva) {
    escribirLineaLcd(1, "FUERA DE RANGO");
  } else {
    escribirLineaLcd(1, "Medicion VALIDA");
  }
}

void medirRpm() {
  const unsigned long ahoraMs = millis();
  const unsigned long intervaloMs = ahoraMs - ultimaMedicionMs;
  if (intervaloMs < PERIODO_MEDICION_MS) return;

  ultimaMedicionMs = ahoraMs;

  noInterrupts();
  const uint32_t pulsos = contadorPulsos;
  contadorPulsos = 0;
  interrupts();

  if (pulsos > 0) {
    ultimoPulsoDetectadoMs = ahoraMs;
    evaluacionRangoHabilitada = true;
  } else if (ahoraMs - inicioMedicionMs >= TIEMPO_SIN_SENAL_MS) {
    evaluacionRangoHabilitada = true;
  }

  sensorSinSenal = evaluacionRangoHabilitada
    && ahoraMs - ultimoPulsoDetectadoMs > TIEMPO_SIN_SENAL_MS;

  float rpmMedida = 0.0f;
  if (pulsos > 0) {
    rpmMedida = (pulsos * 60000.0f / intervaloMs) / PULSOS_POR_VUELTA;
    rpmMedida *= factorCalibracion;
  }

  rpmActual = agregarAlPromedio(rpmMedida);
  if (rpmActual < 0.5f) rpmActual = 0.0f;

  actualizarIndicadores();
  mostrarRpm(rpmActual);
  enviarRpm(rpmActual);

  Serial.print(F("RPM: "));
  Serial.print(rpmActual, 0);
  Serial.print(F(" | Pulsos: "));
  Serial.print(pulsos);
  Serial.print(F(" | Factor: "));
  Serial.println(factorCalibracion, 4);
}

void revisarBotonCalibracion() {
  const bool lecturaActual = digitalRead(PIN_BOTON_CAL);
  const unsigned long ahoraMs = millis();

  if (lecturaActual != lecturaBotonAnterior) {
    lecturaBotonAnterior = lecturaActual;
    ultimoCambioBotonMs = ahoraMs;
  }

  if (ahoraMs - ultimoCambioBotonMs < ANTIRREBOTE_BOTON_MS) return;

  if (lecturaActual != estadoBotonEstable) {
    estadoBotonEstable = lecturaActual;

    if (estadoBotonEstable == LOW) {
      inicioPulsacionMs = ahoraMs;
      calibracionSolicitada = false;
      modoCalibracionActivo = true;
    } else {
      inicioPulsacionMs = 0;
      calibracionSolicitada = false;
      modoCalibracionActivo = false;
    }

    actualizarIndicadores();
  }

  const bool presionado = estadoBotonEstable == LOW;

  if (presionado
      && !calibracionSolicitada
      && ahoraMs - inicioPulsacionMs >= TIEMPO_PULSACION_CAL_MS) {
    calibracionSolicitada = true;

    if (rpmActual > 10.0f) {
      factorCalibracion *= RPM_REFERENCIA_CALIBRACION / rpmActual;
      factorCalibracion = constrain(factorCalibracion, 0.1f, 10.0f);
      guardarCalibracion();

      for (size_t i = 0; i < CANTIDAD_MUESTRAS; i++) historialRpm[i] = 0.0f;
      indiceHistorial = 0;
      muestrasDisponibles = 0;

      escribirLineaLcd(0, "Calibracion OK");
      escribirLineaLcd(1, "Factor " + String(factorCalibracion, 3));
      Serial.println(F("Calibracion guardada en EEPROM."));
    } else {
      escribirLineaLcd(0, "No se calibra");
      escribirLineaLcd(1, "Motor detenido");
    }
  }
}

void conectarWifi() {
  WiFi.mode(WIFI_STA);
  WiFiManager wifiManager;
  wifiManager.setConfigPortalTimeout(PORTAL_WIFI_TIMEOUT_S);

  escribirLineaLcd(0, "Configurar WiFi");
  escribirLineaLcd(1, PORTAL_WIFI_NOMBRE);

  Serial.println(F("Si no hay una red guardada, conectate al portal:"));
  Serial.print(F("Red: "));
  Serial.println(PORTAL_WIFI_NOMBRE);
  Serial.print(F("Clave: "));
  Serial.println(PORTAL_WIFI_CLAVE);
  Serial.println(F("Luego abre http://192.168.4.1"));

  // Si ya existen credenciales guardadas, se conecta automaticamente.
  // Si no, crea el portal indicado arriba para elegir la red desde el telefono.
  const bool conectado =
      wifiManager.autoConnect(PORTAL_WIFI_NOMBRE, PORTAL_WIFI_CLAVE);

  if (conectado && WiFi.status() == WL_CONNECTED) {
    webSocket.begin();
    websocketIniciado = true;

    Serial.print(F("Wi-Fi conectado. IP: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("WebSocket: ws://"));
    Serial.print(WiFi.localIP());
    Serial.println(F(":81/"));

    escribirLineaLcd(0, "WiFi conectado");
    escribirLineaLcd(1, WiFi.localIP().toString());
  } else {
    Serial.println(F("No se pudo conectar al Wi-Fi. El tacometro seguira funcionando sin web."));
    escribirLineaLcd(0, "WiFi sin conex.");
    escribirLineaLcd(1, "Modo local");
  }

  delay(1500);
}

void setup() {
  pinMode(PIN_LED_ROJO, OUTPUT);
  pinMode(PIN_LED_AZUL, OUTPUT);
  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED_ROJO, LOW);
  digitalWrite(PIN_LED_AZUL, LOW);
  digitalWrite(PIN_LED_VERDE, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  Serial.begin(115200);
  delay(100);

  pinMode(PIN_SENSOR_DO, INPUT_PULLUP);
  pinMode(PIN_BOTON_CAL, INPUT_PULLUP);

  Wire.begin(D2, D1);  // SDA, SCL
  lcd.init();
  lcd.backlight();
  escribirLineaLcd(0, "Tacometro PIC II");
  escribirLineaLcd(1, "Iniciando...");

  // Un pitido confirma el inicio de la medicion.
  emitirPitidoInicial();

  cargarCalibracion();
  conectarWifi();

  attachInterrupt(digitalPinToInterrupt(PIN_SENSOR_DO), registrarPulso, FALLING);
  inicioMedicionMs = millis();
  ultimaMedicionMs = inicioMedicionMs;
  ultimoPulsoDetectadoMs = inicioMedicionMs;
}

void loop() {
  if (websocketIniciado) webSocket.loop();
  actualizarSecuenciaBuzzer();
  revisarBotonCalibracion();
  medirRpm();
  yield();
}
