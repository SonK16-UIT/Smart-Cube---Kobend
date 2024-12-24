#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <EEPROM.h>
#include <WiFi.h>

#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

#define EEPROM_SIZE 512
#define WIFI_SSID_ADDR 0
#define WIFI_PASS_ADDR 50
#define USER_ID_ADDR 100

bool deviceConnected = false;
String dataBuffer = ""; // Buffer to hold fragmented data

enum State {
  PAIRING,
  WIFI,
  MAIN
};

State stage = PAIRING;
int wifi_attempts = 0;
const int ATTEMPTS = 3;

void hard_reset() {
  Serial.println("Performing hard reset...");
  ESP.restart();
}

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
  String storedSSID = EEPROM.readString(WIFI_SSID_ADDR);
  String storedPassword = EEPROM.readString(WIFI_PASS_ADDR);

  if (storedSSID.length() > 0 && storedPassword.length() > 0) {
    Serial.println("Found stored WiFi credentials:");
    Serial.println("SSID: " + storedSSID);
    connectToWiFi(storedSSID, storedPassword);
    return WiFi.status() == WL_CONNECTED;
  }
  Serial.println("No stored WiFi credentials found.");
  return false;
}

// Callback class for connection events
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

// Callback class for characteristic write events
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
        EEPROM.writeString(WIFI_SSID_ADDR, wifiSSID);
        EEPROM.writeString(WIFI_PASS_ADDR, wifiPassword);
        EEPROM.writeString(USER_ID_ADDR, userId);
        EEPROM.commit();

        sendAcknowledgment(pCharacteristic, "Success");
        stage = WIFI; // Move to the WiFi connection stage
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
  BLEDevice::init("Cube");
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
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE device is ready as 'Cube'");
}

void setup() {
  Serial.begin(9600);
  if (!EEPROM.begin(EEPROM_SIZE)) {
    Serial.println("Failed to initialize EEPROM");
    return;
  }
  initBLE();
}

void loop() {
  switch (stage) {
    case PAIRING:
      Serial.println("Waiting for WiFi data...");
      delay(1000); // Let BLE handle pairing and receiving data
      break;

    case WIFI:
      Serial.println("Connecting to WiFi...");
      if (initWiFi()) {
        stage = MAIN;
      } else {
        wifi_attempts++;
        if (wifi_attempts >= ATTEMPTS) {
          Serial.println("WiFi connection failed after multiple attempts.");
          hard_reset();
        }
      }
      break;

    case MAIN:
      Serial.println("Main operational mode.");
      // Main operation here
      delay(2000);
      break;
  }
}
