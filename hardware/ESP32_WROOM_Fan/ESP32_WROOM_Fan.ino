#include <WiFi.h>
#include <ESPSupabaseRealtime.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>

// Supabase configuration
String supabase_url = "https://pgqocvvvteooxlehopkk.supabase.co";
String anon_key = "";

// BLE UUIDs
#define SERVICE_UUID "ac8b47f8-4d2f-4508-9ba9-00182ea679fc"
#define CHARACTERISTIC_UUID "287f102d-3f20-4269-afd8-c422cfac27c3"

String deviceState = "ON";
volatile int fanSpeed = 10; // Fan speed percentage (0-100%)

// Pin definitions
#define FAN_PWM_PIN 14 // PWM pin for fan control
#define LED_PIN 33  // GPIO2 for onboard LED
const byte BUTTON_PIN = 27; // Use GPIO 3 for the button
volatile bool button_pressed = false; // Flag to track button state

// Variables
const int pwmFrequency = 25000; // PWM frequency for the fan
const int pwmResolution = 8;    // PWM resolution (8-bit, values 0-255)

SupabaseRealtime realtime;

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
  BLEDevice::init("Fan");
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
  StaticJsonDocument<1024> doc; // Ensure buffer size is large enough
  DeserializationError error = deserializeJson(doc, result);

  if (error) {
    Serial.print("Error parsing JSON: ");
    Serial.println(error.c_str());
    return;
  }

  String tableName = doc["table"].as<String>();
  JsonObject record = doc["record"];

  if (tableName == "devices") {
    if (record.containsKey("status")) {
      deviceState = record["status"].as<String>();
      Serial.print("Extracted Status: ");
      Serial.println(deviceState);
    } else {
      Serial.println("Status field not found in the record.");
    }
  }

  if (tableName == "fans") {
    if (record.containsKey("speed")) {
      fanSpeed = record["speed"].as<int>();
      Serial.print("Extracted Speed: ");
      Serial.println(fanSpeed);
    } else {
      Serial.println("Speed field not found in the record.");
    }
  }
}
// Supabase Initialization
void SupabaseSetup() {
  // Initialize Supabase Realtime
    realtime.begin(supabase_url, anon_key, HandleChanges);
    realtime.login_email("admin89@gmail.com", "ABCabc123!");

  // Listen for updates in the "devices" and "fans" tables
  realtime.addChangesListener("devices", "UPDATE", "public", "id=eq.13");
  realtime.addChangesListener("fans", "UPDATE", "public", "id=eq.13");
  realtime.listen();
}


void IRAM_ATTR handleButtonPress() {
    button_pressed = true;
    Serial.println("Button Pressed!");
}
void blinkLED(int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(duration);
    digitalWrite(LED_PIN, LOW);
    delay(duration);
  }
}
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

    // Configure the fan PWM pin
    ledcAttach(FAN_PWM_PIN, pwmFrequency, pwmResolution); // Using the new library function
    ledcWrite(FAN_PWM_PIN, 0); // Start with the fan off

    // Configure the button pin
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), handleButtonPress, FALLING);

    Serial.println("Fan control initialized.");

}

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
      // Control fan based on deviceState and fanSpeed
      if (deviceState == "ON") {
          int pwmValue = map(fanSpeed, 0, 100, 0, 255);
          ledcWrite(FAN_PWM_PIN, pwmValue);
      } else {
          ledcWrite(FAN_PWM_PIN, 0); // Turn off the fan
      }
       if (button_pressed) {
          // Handle the button press
          Serial.println("Button pressed!");

          // Clear the flag
          button_pressed = false;

          hard_reset();
        }
      delay(50); // Small delay for stability
      break;
  }
}
