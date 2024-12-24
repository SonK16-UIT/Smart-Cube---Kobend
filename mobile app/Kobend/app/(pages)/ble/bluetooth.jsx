import React, { useEffect, useState } from "react";
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
import { useTheme } from '@/lib/ThemeContext';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from "@expo/vector-icons";

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

  const { top } = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState(false);
  const [wifi, setWifi] = useState("");
  const [password, setPassword] = useState("");
  const { profile } = useAuth(); // Access the profile with ID
  const { isDarkMode } = useTheme();

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

  useEffect(() => {
    if (stateBLE === "Success") {
      Alert.alert("Success", "Data sent successfully!");
      disconnectFromDevice();
      setWifi("");
      setPassword("");
      setIsScanning(false);
    }
  }, [stateBLE]);

  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
    >
      <MaterialIcons name="devices" size={24} color="white" style={styles.icon} />
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || "Unnamed Device"}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
    style={{
      flex: 1,
      paddingTop: top + 10,
      backgroundColor: isDarkMode ? '#1A1A2E' : '#FFFFFF',
    }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {isScanning ? 'Searching for devices...' : 'BLE Device Scanner'}
        </Text>
        <Text style={styles.subtitle}>
          {isScanning
            ? "Select a device to establish connection"
            : "Make sure your device is on and its Bluetooth is enabled"}
        </Text>
        {connectedDevice ? (
          <View style={styles.deviceListContainer}>
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
                disabled={stateBLE === "Success"}
              >
                <Text style={styles.ctaButtonText}>
                  {stateBLE === "Success" ? "Data Sent" : "Send"}
                </Text>
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
              <View />
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
    </View>
  );
};

const styles = StyleSheet.create({
  stateBLEText: {
    fontSize: 16,
    color: "#FF6060",
    marginTop: 10,
  },
  
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  deviceListContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  connectedText: {
    fontSize: 18,
    color: "#FF6060",
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
    backgroundColor: "#FF6060",
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B2F3A',
    padding: 15,
    borderRadius: 10,
    marginBottom: hp(1),
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
  subtitle: {
    fontSize: hp(2),
    color: 'gray',
    textAlign: 'center',
    marginBottom: hp(4),
  },
});

export default BLE;
