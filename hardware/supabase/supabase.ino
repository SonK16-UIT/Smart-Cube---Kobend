#include "MPU9250.h"
#include <WiFi.h>
#include <ESPSupabase.h>
#include <ArduinoJson.h>

Supabase db;

String supabase_url = "https://pgqocvvvteooxlehopkk.supabase.co";
String anon_key = "";

MPU9250 mpu;

// put your WiFi credentials (SSID and Password) here
const char *ssid = "KB-NOIBO";
const char *psswd = "";

const String email = "admin89@gmail.com";
const String password = "ABCabc123!";


// Base orientation values
float basePitch = 0;
float baseRoll = 0;
float previousYaw = 0;
float previousPitch = 0;
float previousRoll = 0;

// Kalman filter variables for yaw
float kalmanYaw = 0;
float kalmanUncertainty = 4.0;  // Initial uncertainty

// Define thresholds for detecting orientation changes and actions
const float angleThreshold = 30.0;         // Adjust this value as needed
const float shakeThreshold = 2;          // Threshold for shake detection (g-forces)
const float significantRotation = 20.0;    // Minimum consistent rotation for direction detection
const unsigned long cooldownPeriod = 2000; // 4 seconds cooldown period in milliseconds
unsigned long lastActionTime = 0;          // Store the last time an action was detected
int face_delay = 0;

String currentFace = "Unknown";
String previousFace = "Unknown";

void setup() {
    Serial.begin(115200);

    Serial.print("Connecting to WiFi");
    WiFi.begin(ssid, psswd);
    while (WiFi.status() != WL_CONNECTED)
    {
      delay(100);
      Serial.print(".");
    }
    Serial.println("\nConnected!");

    db.begin(supabase_url, anon_key);

    // // ONLY IF you activate RLS in your Supabase Table
    int loginCode = db.login_email(email, password);

    Serial.print("Login response code: ");
    Serial.println(loginCode);

    if (loginCode != 200) {
      Serial.println("Login failed. Check email/password or Supabase RLS settings.");
      return;
    }

    Wire.begin(6,7);
    delay(2000);

    if (!mpu.setup(0x68)) {  // MPU9250 I2C address
        while (1) {
            Serial.println("MPU connection failed. Please check your connection.");
            delay(5000);
        }
    }

    // Get initial base orientation
    Serial.println("Place the cube in the base position and hold it steady.");

    // Calculate base orientation by averaging over 150 iterations
    float totalPitch = 0, totalRoll = 0, totalYaw = 0;
    for (int i = 0; i < 150; i++) {
        if (mpu.update()) {
            // totalPitch += mpu.getPitch();
            // totalRoll += mpu.getRoll();
            totalYaw += mpu.getYaw();
        }
        delay(10);  // Small delay to allow readings to stabilize
    }

    // Calculate average as the base orientation
    previousYaw = totalYaw / 150;
    kalmanYaw = previousYaw;  // Initialize Kalman filter for yaw

    delay(5000); // Give time to place cube in base position
    Serial.print("Base Pitch: ");
    Serial.print(basePitch, 2);
    Serial.print(" | Base Roll: ");
    Serial.print(baseRoll, 2);
    Serial.print(" | Base Yaw: ");
    Serial.println(previousYaw, 2);
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

void loop() {
    if (mpu.update()) {
        float currentPitch = mpu.getPitch();
        float currentRoll = mpu.getRoll();
        float currentYaw = mpu.getYaw();

        // Apply Kalman filter to the yaw angle
        currentYaw = kalmanFilterYaw(currentYaw, previousYaw);

        // Calculate the differences from the previous orientation
        float pitchDiff = currentPitch - basePitch;
        float rollDiff = currentRoll - baseRoll;

        // Detect and print the current face orientation
        currentFace = detectFaceOrientation(currentPitch, currentRoll, pitchDiff, rollDiff);

        if(previousFace != currentFace){
          face_delay= face_delay + 1;
          if(face_delay==10){
            Serial.println("--Changed Face--");
            Serial.print("Current Face: ");
            Serial.println(currentFace);
            Serial.print("Previous Face: ");
            Serial.println(previousFace);
            face_delay=0;
            updateSupabaseOne(currentFace);
            previousFace = currentFace;
          }
        } else {
          Serial.print("Current Face: ");
          Serial.println(currentFace);
          if (currentFace != "Unknown") {
              detectAction(currentPitch, currentRoll, currentYaw);
          }

          // Update previous values for the next iteration
          previousYaw = currentYaw;
          previousPitch = currentPitch;
          previousRoll = currentRoll;
          if(currentFace == previousFace ) previousFace = currentFace;
        }
        delay(2000);
    }
}

// Kalman filter function to smooth the yaw readings
float kalmanFilterYaw(float measurement, float previousEstimate) {
    float processNoise = 1.0;  // Adjust as necessary
    float measurementNoise = 3.0;  // Adjust as necessary

    // Prediction update
    kalmanYaw = kalmanYaw + (measurement - previousEstimate);  // Update based on change
    kalmanUncertainty += processNoise;

    // Measurement update
    float kalmanGain = kalmanUncertainty / (kalmanUncertainty + measurementNoise);
    kalmanYaw = kalmanYaw + kalmanGain * (measurement - kalmanYaw);
    kalmanUncertainty = (1 - kalmanGain) * kalmanUncertainty;

    return kalmanYaw;
}

// Detect which face is currently facing down based on orientation change from the previous orientation
String detectFaceOrientation(float currentPitch, float currentRoll, float pitchDiff, float rollDiff) {
    if (fabs(pitchDiff) < angleThreshold && fabs(rollDiff) < angleThreshold) {
        return "top";  // Cube is likely in the base orientation
    }
    else if (fabs(rollDiff) > 150 && fabs(currentPitch) < angleThreshold) {
        return "bottom";  // Cube flipped with bottom facing down
    }
    else if (fabs(pitchDiff - 90) < angleThreshold) {
        return "right";  // Right face is down
    }
    else if (fabs(pitchDiff + 90) < angleThreshold) {
        return "left";  // Left face is down
    }
    else if (fabs(rollDiff - 90) < angleThreshold) {
        return "front";  // Front face is down
    }
    else if (fabs(rollDiff + 90) < angleThreshold) {
        return "back";  // Back face is down
    }
    else {
        return "Unknown";  // Orientation does not match any known face
    }
}

// Detect actions on the current face: Shake, Clockwise, or Counter-clockwise based on the specific axis for each face
void detectAction(float currentPitch, float currentRoll, float currentYaw) {
    unsigned long currentTime = millis();

    // Only detect actions if cooldown period has passed
    if (currentTime - lastActionTime < cooldownPeriod) {
        return; // Skip action detection until cooldown period is over
    }

    float accelX = mpu.getAccX();
    float accelY = mpu.getAccY();
    float accelZ = mpu.getAccZ();

    // Check for shake action
    float totalAccel = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
    if (totalAccel > shakeThreshold) {
        Serial.println("---- Action ----");
        Serial.println("Detect Shake");
        updateSupabaseTwo(previousFace,"shake");
        lastActionTime = currentTime; // Reset cooldown timer
        return;  // Exit the function to ensure only shake is detected this iteration
    }
    
    // Check for rotation actions based on the face
    float angleDiff;
    if (currentFace == "Top" || currentFace == "Bottom") {
        // Serial.println("---- Debugging Yaw Rotation ----");
        angleDiff = currentYaw - previousYaw;
        // Serial.printf("Previous Yaw: %.2f, Current Yaw: %.2f, Yaw Difference: %.2f\n", previousYaw, currentYaw, angleDiff);
    } else if (currentFace == "Left" || currentFace == "Right") {
        // Serial.println("---- Debugging Pitch Rotation ----");
        angleDiff = currentPitch - previousPitch;
        // Serial.printf("Previous Pitch: %.2f, Current Pitch: %.2f, Pitch Difference: %.2f\n", previousPitch, currentPitch, angleDiff);
    } else if (currentFace == "Front" || currentFace == "Back") {
        // Serial.println("---- Debugging Roll Rotation ----");
        angleDiff = currentRoll - previousRoll;
        // Serial.printf("Previous Roll: %.2f, Current Roll: %.2f, Roll Difference: %.2f\n", previousRoll, currentRoll, angleDiff);
    } else {
        return;
    }


    if (fabs(angleDiff) > significantRotation) {
        Serial.println("---- Action ----");
        if (angleDiff > 0) {
            Serial.print("Clockwise on ");
            updateSupabaseTwo(previousFace,"clockwise");
        } else {
            Serial.print("Counter-Clockwise on ");
            updateSupabaseTwo(previousFace,"r_clockwise");
        }
        Serial.println(currentFace);
        lastActionTime = currentTime; // Reset cooldown timer
    }
}
