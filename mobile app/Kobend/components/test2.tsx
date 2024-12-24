import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import useBLE from "@/useBLE.ts";
import { useAuth } from "@/providers/AuthProvider";
import { useDeviceUUID } from "@/api/cubeuuid";

const BLE = () => {
  const {
    requestPermissions,
    scanForPeripherals,
    connectToDevice,
    disconnectFromDevice,
    writeCharacteristic,
    allDevices,
    connectedDevice,
    stateBLE,
  } = useBLE();

  const [isScanning, setIsScanning] = useState(false);
  const [wifi, setWifi] = useState("");
  const [password, setPassword] = useState("");
  const { profile } = useAuth(); // Access the profile with ID

  // Fetch device UUIDs dynamically based on the selected device's name
  const { data: deviceUUIDs, isLoading: isUUIDLoading, error: uuidError } =
    useDeviceUUID(connectedDevice?.name || "");

  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (!isPermissionsEnabled) {
      Alert.alert(
        "Permission Required",
        "Permission to use Bluetooth is required."
      );
      return;
    }
    setIsScanning(true);
    scanForPeripherals();

    setTimeout(() => {
      setIsScanning(false);
    }, 10000);
  };

  const sendDataToDevice = async () => {
    if (!wifi || !profile?.id || !deviceUUIDs) {
      Alert.alert(
        "Missing Data",
        "Ensure WiFi, Profile ID, and UUIDs are available."
      );
      return;
    }

    const { serviceUUID, characteristicUUID } = deviceUUIDs;

    try {
      const payload = JSON.stringify({ wifi, password, profileId: profile.id });

      // Ensure the payload size is within MTU limit
      const mtu = 20; // Default MTU size
      if (payload.length > mtu) {
        console.warn("Payload exceeds MTU size, splitting into chunks...");
        const chunks = payload.match(new RegExp(`.{1,${mtu}}`, "g"));
        for (const chunk of chunks) {
          await writeCharacteristic(serviceUUID, characteristicUUID, chunk);
        }
      } else {
        await writeCharacteristic(serviceUUID, characteristicUUID, payload);
      }

      console.log("Data successfully sent.");
    } catch (error) {
      console.error("Failed to send data:", error);
      Alert.alert("Error", "Failed to send data. Please try again.");
    }
  };

  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
    >
      <Text style={styles.deviceName}>{item.name || "Unnamed Device"}</Text>
      <Text style={styles.deviceId}>{item.id}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BLE Device Scanner</Text>
        {connectedDevice ? (
          <View style={styles.connectedContainer}>
            <Text style={styles.connectedText}>
              Connected to {connectedDevice.name}
            </Text>
            {isUUIDLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : uuidError ? (
              <Text style={styles.errorText}>
                Failed to fetch device UUIDs: {uuidError.message}
              </Text>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="WiFi Name"
                  value={wifi}
                  onChangeText={setWifi}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                {stateBLE ? (
                  <Text style={styles.stateBLEText}>BLE Status: {stateBLE}</Text>
                ) : null}

                <TouchableOpacity
                  onPress={sendDataToDevice}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaButtonText}>Send</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={disconnectFromDevice}
              style={styles.ctaButtonSecondary}
            >
              <Text style={styles.ctaButtonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={scanForDevices}
            style={styles.ctaButton}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaButtonText}>Scan for Devices</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      {!connectedDevice && (
        <View style={styles.deviceListContainer}>
          {isScanning ? (
            <ActivityIndicator size="large" color="#FF6060" />
          ) : (
            <FlatList
              data={allDevices}
              keyExtractor={(item) => item.id}
              renderItem={renderDeviceItem}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>
                  {isScanning ? "Scanning for devices..." : "No devices found"}
                </Text>
              }
              contentContainerStyle={styles.deviceList}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  stateBLEText: {
    fontSize: 16,
    color: "#007AFF",
    marginTop: 10,
  },
  
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  connectedContainer: {
    width: "100%",
    padding: 20,
    alignItems: "center",
    backgroundColor: "#E3F2FD",
  },
  connectedText: {
    fontSize: 18,
    color: "#007AFF",
    marginVertical: 10,
  },
  input: {
    width: "90%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
    backgroundColor: "#fff",
  },
  ctaButton: {
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    width: "90%",
    borderRadius: 8,
    marginTop: 10,
  },
  ctaButtonSecondary: {
    backgroundColor: "#FF6060",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    width: "90%",
    borderRadius: 8,
    marginTop: 10,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginVertical: 10,
  },
  deviceListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  deviceList: {
    paddingBottom: 20,
  },
  deviceItem: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  deviceId: {
    fontSize: 12,
    color: "gray",
    marginTop: 5,
  },
  emptyListText: {
    textAlign: "center",
    color: "gray",
    marginTop: 20,
  },
});

export default BLE;
