#include <WiFi.h>
#include <ESPSupabaseRealtime.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>


SupabaseRealtime realtime;
// Supabase configuration
String supabase_url = "https://pgqocvvvteooxlehopkk.supabase.co";
String anon_key = "";

const String email = "admin89@gmail.com";
const String password = "ABCabc123!";

// NeoPixel settings
#define PIN 5       // GPIO 5 for NeoPixel control
#define NUMPIXELS 8
#define LED_PIN 8   // GPIO8 for onboard LED

const byte button_pin = 3; // Use GPIO 3 for the button
volatile bool button_pressed = false; // Flag to track button state

Adafruit_NeoPixel pixels(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

// BLE UUIDs
#define SERVICE_UUID "0a1bc20d-2f75-4c5a-a1fc-e5c0d1234abc"
#define CHARACTERISTIC_UUID "2b8cd482-9f60-43d4-8b7f-1e723659abcd"

// Device state
String deviceState = "ON";
int ledDim = 10;

Preferences preferences;

// Stage management
enum Stage { PAIRING, WIFI, SUPABASE, MAIN };
Stage stage = WIFI;
int wifi_attempts = 0;
const int ATTEMPTS = 3;
bool deviceConnected = false;
String dataBuffer = "";


void hard_reset() {
  Serial.println("Performing hard reset...");
  preferences.clear();
  ESP.restart();
}

void IRAM_ATTR handleButtonPress() {
  button_pressed = true; // Set the flag when the button is pressed
}

// Connect to Wi-Fi
void connectToWiFi(const String& ssid, const String& password) {
  Serial.println("\nAttempting to connect to WiFi...");
  WiFi.begin(ssid.c_str(), password.c_str());

  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi.");
  }
}
bool initWiFi() {
  String storedSSID = preferences.getString("WIFI_SSID", "");
  String storedPassword = preferences.getString("WIFI_PASS", "");

  if (storedSSID.length() > 0 && storedPassword.length() > 0) {
    Serial.println("Found stored WiFi credentials:");
    Serial.println("SSID: " + storedSSID);
    connectToWiFi(storedSSID, storedPassword);
    return WiFi.status() == WL_CONNECTED;
  }
  Serial.println("No stored WiFi credentials found.");
  return false;
}

// BLE Callbacks
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    Serial.println("Device connected!");
    deviceConnected = true;
  }

  void onDisconnect(BLEServer* pServer) override {
    Serial.println("Device disconnected!");
    deviceConnected = false;
    BLEDevice::startAdvertising();
    Serial.println("Advertising restarted");
  }
};

class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
  void sendAcknowledgment(BLECharacteristic* pCharacteristic, const String& message) {
    pCharacteristic->setValue(message.c_str());
    pCharacteristic->notify();
    Serial.println("Acknowledgment sent to client: " + message);
  }

  void processCompleteData(BLECharacteristic* pCharacteristic) {
    Serial.println("Complete data received: " + dataBuffer);

    int ssidStart = dataBuffer.indexOf("\"wifi\":\"") + 8;
    int ssidEnd = dataBuffer.indexOf("\",", ssidStart);
    int passwordStart = dataBuffer.indexOf("\"password\":\"") + 12;
    int passwordEnd = dataBuffer.indexOf("\",", passwordStart);
    int userIdStart = dataBuffer.indexOf("\"profileId\":\"") + 13;
    int userIdEnd = dataBuffer.indexOf("\"", userIdStart);

    if (ssidStart != -1 && ssidEnd != -1 && passwordStart != -1 && passwordEnd != -1 && userIdStart != -1 && userIdEnd != -1) {
      String wifiSSID = dataBuffer.substring(ssidStart, ssidEnd);
      wifiSSID.trim();
      String wifiPassword = dataBuffer.substring(passwordStart, passwordEnd);
      wifiPassword.trim();
      String userId = dataBuffer.substring(userIdStart, userIdEnd);
      userId.trim();

      Serial.println("WiFi: " + wifiSSID);
      Serial.println("Password: " + wifiPassword);
      Serial.println("User ID: " + userId);

      if (wifiSSID.length() > 0 && wifiPassword.length() > 0 && userId.length() > 0) {
        preferences.putString("WIFI_SSID", wifiSSID);
        preferences.putString("WIFI_PASS", wifiPassword);
        preferences.putString("USER_ID", userId);
        stage = WIFI;
        sendAcknowledgment(pCharacteristic, "Success");
        delay(5000);
          // Stop BLE advertising
        BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
        if (pAdvertising) {
          pAdvertising->stop();
          Serial.println("Advertising stopped.");
        }
        // Deinitialize BLE if needed
        BLEDevice::deinit();
        Serial.println("BLE deinitialized.");
        delay(10000);
      } else {
        Serial.println("Parsed fields contain empty values. Ignoring data.");
        sendAcknowledgment(pCharacteristic, "Invalid data format");
      }
    } else {
      Serial.println("Invalid data format. Could not parse data.");
      sendAcknowledgment(pCharacteristic, "Invalid data format");
    }
    dataBuffer = "";
  }

  void onWrite(BLECharacteristic* pCharacteristic) override {
    String value = pCharacteristic->getValue().c_str();
    if (value.length() > 0) {
      Serial.println("Received data chunk: " + value);
      dataBuffer += value;
      sendAcknowledgment(pCharacteristic, "Acknowledged");

      if (dataBuffer.indexOf("{") != -1 && dataBuffer.endsWith("}")) {
        processCompleteData(pCharacteristic);
      } else {
        Serial.println("Waiting for more data chunks...");
      }
    }
  }
};

void initBLE() {
  BLEDevice::init("Led");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  BLECharacteristic* pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );

  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("BLE device ready.");
}
// Handle incoming changes
void HandleChanges(String result) {
  // Parse the JSON
  StaticJsonDocument<1024> doc; // Ensure buffer size is large enough
  DeserializationError error = deserializeJson(doc, result);

  if (error) {
    Serial.print("Error parsing JSON: ");
    Serial.println(error.c_str());
    return;
  }

  // Extract the "table" name and "record" object
  String tableName = doc["table"].as<String>();
  JsonObject record = doc["record"];

  // Handle updates for the "devices" table
  if (tableName == "devices") {
    if (record.containsKey("status")) {
      deviceState = record["status"].as<String>();
      Serial.print("Extracted Status: ");
      Serial.println(deviceState);
      blinkLED(1, 500);
    } else {
      Serial.println("Status field not found in the record.");
    }
  }

  // Handle updates for the "leds" table
  if (tableName == "leds") {
    if (record.containsKey("dim")) {
      ledDim = record["dim"].as<int>();
      Serial.print("Extracted Dim: ");
      Serial.println(ledDim);
      blinkLED(1, 500);
    } else {
      Serial.println("Dim field not found in the record.");
    }
  }
}

// Supabase Initialization
void SupabaseSetup() {
  realtime.begin(supabase_url, anon_key, HandleChanges);
  realtime.login_email("admin89@gmail.com", "ABCabc123!");

  realtime.addChangesListener("devices", "UPDATE", "public", "id=eq.14");
  realtime.addChangesListener("leds", "UPDATE", "public", "id=eq.14");
  realtime.listen();
}

// LED Blink for indication
void blinkLED(int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(duration);
    digitalWrite(LED_PIN, HIGH);
    delay(duration);
  }
}

// Setup
void setup() {
  Serial.begin(9600);
  preferences.begin("wifi", false);
  pinMode(LED_PIN, OUTPUT);
  
  if (initWiFi()) {
    stage = SUPABASE;
  } else {
    stage = PAIRING;
    initBLE();
  }

  // Initialize NeoPixel
  pixels.begin();
  pixels.setBrightness(ledDim);
  pixels.show();

  // Configure the button pin as input with internal pull-up
  pinMode(button_pin, INPUT_PULLUP);
    
  // Attach the interrupt to the button pin
  attachInterrupt(digitalPinToInterrupt(button_pin), handleButtonPress, FALLING); // Trigger on button press
}

// Loop
void loop() {
  switch (stage) {
  case PAIRING: 
    Serial.println("Waiting for BLE pairing...");
    blinkLED(1, 500);
    delay(1000);
    break;

  case WIFI:
    if (initWiFi()) {
      stage = SUPABASE;
    } else if (++wifi_attempts >= ATTEMPTS) {
        hard_reset();
    }
    break;

  case SUPABASE:
    SupabaseSetup();
    stage = MAIN;
    blinkLED(3, 500);
    break;

  case MAIN:
    realtime.loop();
    if (deviceState == "ON") {
      pixels.clear();
      pixels.setBrightness(ledDim);
      for (int i = 0; i < NUMPIXELS; i++) {
        pixels.setPixelColor(i, pixels.Color(0, 150, 0)); // Green for "ON"
      }
      pixels.show();
    } else {
      pixels.clear();
      pixels.show();
    }
    if (button_pressed) {
          // Handle the button press
          Serial.println("Button pressed!");

          // Clear the flag
          button_pressed = false;

          hard_reset();
        }
    break;
  }
}
