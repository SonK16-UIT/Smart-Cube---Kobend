#include <WiFi.h>
#include <ESPSupabase.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "MPU9250.h"
#include <Preferences.h>

Supabase db;
String supabase_url = "https://pgqocvvvteooxlehopkk.supabase.co";
String anon_key = "";

const String email = "admin89@gmail.com";
const String password = "ABCabc123!";

// BLE UUIDs
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define LED_PIN  1 // GPIO1 is connected to the LED

const byte button_pin = 3; // Use GPIO 3 for the button
volatile bool button_pressed = false; // Flag to track button state

Preferences preferences;

// State Machine
enum State {
  PAIRING,
  WIFI,
  SUPABASE,
  MAIN
};

State stage = WIFI;
int wifi_attempts = 0;
const int ATTEMPTS = 3;
bool deviceConnected = false;
String dataBuffer = ""; // BLE data buffer

MPU9250 mpu;

// Kalman filter variables
float KalmanYaw = 0.0, KalmanUncertaintyYaw = 2 * 2;
float KalmanPitch = 0.0, KalmanUncertaintyPitch = 2 * 2;
float KalmanRoll = 0.0, KalmanUncertaintyRoll = 2 * 2;
uint32_t LoopTimer;

// Base orientation values
float basePitch = 0;
float baseRoll = 0;

String currentFace = "Unknown";
String previousFace = "Unknown";

const float flipThreshold = 30.0;

int trigger1count =0;

bool trigger2=true;
int trigger2count= 0;

bool trigger4=true, trigger5=false , trigger6=false;
int trigger4count= 0, trigger5count = 0,trigger6count = 0;
float previousAngle=0;
float previousAmp=0;

void blink(){
  digitalWrite(LED_PIN, HIGH); // Turn the LED on
  delay(700);                 // Wait for 1 second
  digitalWrite(LED_PIN, LOW);  // Turn the LED off
  delay(300);                 // Wait for 1 second
}
// Utility Functions
void hard_reset() {
  Serial.println("Performing hard reset...");
  String response = db.from("devices").select("*").eq("id", "12").limit(1).doSelect();

  if (response.length() > 0) {
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (error) {
      Serial.print("Error parsing JSON: ");
      Serial.println(error.c_str());
      return;
    }

    // Check if the response is an array
    if (doc.is<JsonArray>()) {
      JsonArray array = doc.as<JsonArray>();
      if (array.size() > 0) {
        const char* user_id = array[0]["user_id"]; // Access the first object in the array
        if (user_id == nullptr) {
          Serial.println("User ID is NULL. Clearing preferences and restarting...");
          preferences.clear();
          ESP.restart();
        } else {
          Serial.print("Device UserId: ");
          Serial.println(user_id);
          db.urlQuery_reset();
        }
      } else {
        Serial.println("Array is empty.");
      }
    } else {
      Serial.println("Expected JSON array but got something else.");
    }
  } else {
    Serial.println("No response received from Supabase.");
  }
}



void IRAM_ATTR handleButtonPress() {
  button_pressed = true; // Set the flag when the button is pressed
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
  BLEDevice::startAdvertising();

  Serial.println("BLE device ready.");
}

void SupabaseSetup() {
  db.begin(supabase_url, anon_key);

  int loginCode = db.login_email(email, password);
  Serial.print("Supabase login response: ");
  Serial.println(loginCode);

  if (loginCode != 200) {
    Serial.println("Supabase login failed.");
  }
}

void updateUserId() {
  String storedUserId = preferences.getString("USER_ID", "");
  String table = "devices";
  String JSON = "{\"user_id\":\"" + storedUserId + "\"}";
  int updateCode = db.update(table).eq("id", "12").doUpdate(JSON);
  Serial.print("Update response code: ");
  Serial.println(updateCode);

  if (updateCode == 200 || updateCode == 204) {
    Serial.println("Update successful!");
  } else {
    Serial.print("Update failed, code: ");
    Serial.println(updateCode);
  }

  db.urlQuery_reset();
}

// Function for Kalman filter
void kalman_1d(float &KalmanState, float &KalmanUncertainty, float KalmanInput, float KalmanMeasurement) {
    // Prediction phase
    KalmanState = KalmanState + 0.004 * KalmanInput; // Predict new state
    KalmanUncertainty = KalmanUncertainty + 0.004 * 0.004 * 4 * 4; // Predict uncertainty

    // Update phase
    float measurementError = 3; // Measurement noise
    float KalmanGain = KalmanUncertainty / (KalmanUncertainty + measurementError * measurementError);
    KalmanState = KalmanState + KalmanGain * (KalmanMeasurement - KalmanState);
    KalmanUncertainty = (1 - KalmanGain) * KalmanUncertainty;
}

void updateSupabaseOne(String currentSide) {
    String table = "cubes";
    String JSON = "{\"current_side\":\"" + currentSide + "\"}";
    int updateCode = db.update(table).eq("id", "12").doUpdate(JSON);
    Serial.print("Update response code: ");
    Serial.println(updateCode);

    // Check if the update was successful
    if (updateCode == 200 || updateCode == 204) {
      Serial.println("Update successful!");
    } else {
      Serial.print("Update failed, code: ");
      Serial.println(updateCode);
    }

    // Reset the URL query to clean up
    db.urlQuery_reset();
}
void updateSupabaseTwo(String currentSide, String state) {
    String table = "cubes";
    String JSON = "{\"current_side\":\"" + currentSide + "\", \"state\":\"" + state + "\"}";
    int updateCode = db.update(table).eq("id", "12").doUpdate(JSON);
    Serial.print("Update response code: ");
    Serial.println(updateCode);

    // Check if the update was successful
    if (updateCode == 200 || updateCode == 204) {
      Serial.println("Update successful!");
    } else {
      Serial.print("Update failed, code: ");
      Serial.println(updateCode);
    }

    // Reset the URL query to clean up
    db.urlQuery_reset();
}

// Function to detect the orientation flip based on changes
String detectFaceOrientation(float currentPitch, float currentRoll, float pitchDiff, float rollDiff) {
    if (fabs(pitchDiff) < flipThreshold && fabs(rollDiff) < flipThreshold) {
        return "top";  // Cube is likely in the base orientation
    } 
    else if (fabs(rollDiff) > 150 && fabs(currentPitch) < flipThreshold) {
        return "bottom";  // Cube flipped with bottom facing down
    } 
    else if (fabs(pitchDiff - 90) < flipThreshold) {
        return "right";  // Right face is down
    } 
    else if (fabs(pitchDiff + 90) < flipThreshold) {
        return "left";  // Left face is down
    } 
    else if (fabs(rollDiff - 90) < flipThreshold) {
        return "front";  // Front face is down
    } 
    else if (fabs(rollDiff + 90) < flipThreshold) {
        return "back";  // Back face is down
    } 
    else {
        return "Unknown";  // Orientation does not match any known face
    }
}
void detectShake(float Amp){
    if(trigger4) trigger4count++;
    if(trigger4count == 9 && !trigger5 && !trigger6){
      // Serial.print("amp: ");
      // Serial.println(Amp);
      if(Amp - previousAmp >= 0.7){
        Serial.println("Trigger 1");
        trigger4=false;
        trigger5=true;
      }
      trigger4count=0;
    } else if(trigger4count == 1) {
      previousAmp = Amp;
      // Serial.print("thres1 amp: ");
      // Serial.println(previousAmp);
    }

    if(trigger5) trigger5count++;
    if(trigger5count == 7 && !trigger4 && !trigger6){
      // Serial.print("amp: ");
      // Serial.println(Amp);
      if(previousAmp - Amp >= 0.8){
        Serial.println("Trigger 2");
        trigger6=true;
      } else {
        trigger4=true;
      }
      trigger5=false;
      trigger5count=0;
    } else if(trigger5count == 1) {
      previousAmp = Amp;
      // Serial.print("thres2 amp: ");
      // Serial.println(previousAmp);
    }

    if(trigger6) trigger6count++;
    if(trigger6count == 8 && !trigger5 && !trigger4){
      // Serial.print("amp: ");
      // Serial.println(Amp);
      if(Amp - previousAmp >= 1){
        Serial.println("Detect shake");
        updateSupabaseTwo(currentFace,"shake");
      }
      trigger4=true;
      trigger6=false;
      trigger6count=0;
      // Serial.println("");
    } else if(trigger6count == 1){
      previousAmp = Amp;
      // Serial.print("thres3 amp: ");
      // Serial.println(previousAmp);
    } 
} 
void detectRotation(float angleValue, int angle1, int count1) {

    if (trigger2) trigger2count++;
    if (trigger2count == count1) { // Dynamic timing for first trigger
        // Serial.print("Counting trigger 2..., ");
        if (fabs(angleValue - previousAngle) >= angle1) {
            Serial.print("Base Angle: ");
            Serial.println(angleValue);
            Serial.print("Angle After: ");
            Serial.println(previousAngle);
            if(currentFace == "Top" || currentFace == "Front"){
              if(angleValue > previousAngle ){
                 Serial.println("\n--Rotate Left Confirmed--");
                 updateSupabaseTwo(currentFace,"r_clockwise");
              }
              else {
                Serial.println("\n--Rotate Right Confirmed--");
                updateSupabaseTwo(currentFace,"clockwise");
              }
            } else {
              if(angleValue < previousAngle ){
                Serial.println("\n--Rotate Right Confirmed--");
                updateSupabaseTwo(currentFace,"clockwise");
              }
              else {
                Serial.println("\n--Rotate Left Confirmed--");
                updateSupabaseTwo(currentFace,"r_clockwise");
              }
            }

        } 
        trigger2 = true;
        trigger2count = 0;
    } else if (trigger2count == 1) {
        previousAngle = angleValue;
        // Serial.print("Angle Before: ");
        // Serial.println(previousAngle);
    }
}
void timeout(){
  trigger2 = true,trigger4 = true,trigger5 = false,trigger6 = false;
  trigger1count = 0, trigger2count= 0,trigger4count= 0, trigger5count = 0,trigger6count = 0;
}
void setup() {
  Serial.begin(9600);
  preferences.begin("wifi", false);
  pinMode(LED_PIN, OUTPUT); // Set GPIO2 as an output

  if (initWiFi()) {
    stage = SUPABASE;
  } else {
    stage = PAIRING;
    initBLE();
  }

  Wire.begin(8, 9);
    delay(2000);
    
    MPU9250Setting setting; 
    setting.accel_fs_sel = ACCEL_FS_SEL::A4G;          // Accelerometer: ±4g
    setting.gyro_fs_sel = GYRO_FS_SEL::G500DPS;       // Gyroscope: ±500°/s
    setting.mag_output_bits = MAG_OUTPUT_BITS::M16BITS; // Magnetometer: 16 bits
    setting.fifo_sample_rate = FIFO_SAMPLE_RATE::SMPL_200HZ; // Sampling rate: 200Hz
    setting.gyro_fchoice = 0x03;                      // Gyro filtered mode
    setting.gyro_dlpf_cfg = GYRO_DLPF_CFG::DLPF_41HZ; // Gyro DLPF: 41Hz
    setting.accel_fchoice = 0x01;                     // Accelerometer filtered mode
    setting.accel_dlpf_cfg = ACCEL_DLPF_CFG::DLPF_45HZ; // Accelerometer DLPF: 45Hz

    if (!mpu.setup(0x68, setting)) {  // change to your own address
        while (1) {
            Serial.println("MPU connection failed. Please check your connection with connection_check example.");
            blink();
            blink();
            delay(5000);
        }
    }

    // Calibrate accelerometer, gyroscope, and magnetometer
    Serial.println("Accel/Gyro calibration will start in 5 seconds.");
    Serial.println("Leave the device still on a flat surface.");
    delay(5000);
    mpu.calibrateAccelGyro();

    Serial.println("Magnetometer calibration will start in 5 seconds.");
    Serial.println("Wave the device in a figure-eight pattern.");
    delay(5000);
    mpu.calibrateMag();

    Serial.println("Calibration complete.");

    // Configure the button pin as input with internal pull-up
    pinMode(button_pin, INPUT_PULLUP);
    
    // Attach the interrupt to the button pin
    attachInterrupt(digitalPinToInterrupt(button_pin), handleButtonPress, FALLING); // Trigger on button press
}

void loop() {
    switch (stage) {
    case PAIRING:
      Serial.println("Waiting for BLE pairing...");
      blink();
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
      updateUserId();
      stage = MAIN;
      blink();
      blink();
      blink();
      break;

    case MAIN:
      if (mpu.update()) {
        // Compute raw yaw, pitch, roll without Kalman filter
        float rawYaw = atan2(mpu.getMagY(), mpu.getMagX()) * 180.0 / M_PI;
        float rawPitch = atan2(-mpu.getAccX(), sqrt(mpu.getAccY() * mpu.getAccY() + mpu.getAccZ() * mpu.getAccZ())) * 180.0 / M_PI;
        float rawRoll = atan2(mpu.getAccY(), mpu.getAccZ()) * 180.0 / M_PI;

        // Get gyroscope rates for yaw, pitch, roll
        float gyroYawRate = mpu.getGyroZ();
        float gyroPitchRate = mpu.getGyroY();
        float gyroRollRate = mpu.getGyroX();
        float accelX = mpu.getAccX();
        float accelY = mpu.getAccY();
        float accelZ = mpu.getAccZ();

        // Apply Kalman filter to yaw, pitch, and roll
        kalman_1d(KalmanYaw, KalmanUncertaintyYaw, gyroYawRate, rawYaw);
        kalman_1d(KalmanPitch, KalmanUncertaintyPitch, gyroPitchRate, rawPitch);
        kalman_1d(KalmanRoll, KalmanUncertaintyRoll, gyroRollRate, rawRoll);

        // Calculate the difference between current and base orientation
        float pitchDiff = KalmanPitch - basePitch;
        float rollDiff = KalmanRoll - baseRoll;

        float totalAccel = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

        // Detect the face based on flip orientation
        currentFace = detectFaceOrientation(KalmanPitch, KalmanRoll, pitchDiff, rollDiff);
         if(previousFace != currentFace){
          trigger1count++;
          if(trigger1count == 250){ // 1s
             Serial.println("--Changed Face--");
            Serial.print("Current Face: ");
            Serial.println(currentFace);
            Serial.print("Previous Face: ");
            Serial.println(previousFace);
            timeout();
            updateSupabaseOne(currentFace);
            previousFace = currentFace;
          }
        } else if(currentFace != "Bottom") {
          detectShake(totalAccel);
          if(currentFace == "top" && !trigger5 && !trigger6 ) detectRotation(KalmanYaw,60,135);
          else if (currentFace == "front"  && !trigger5 && !trigger6) detectRotation(KalmanPitch,30,30);
          else if (currentFace == "back" && !trigger5 && !trigger6 ) detectRotation(KalmanPitch,40,30);
        }
        if (button_pressed) {
          // Handle the button press
          Serial.println("Button pressed!");

          // Clear the flag
          button_pressed = false;

          hard_reset();
        }

        while (micros() - LoopTimer < 4000);
        LoopTimer = micros();
        break;
      }
    }
}
