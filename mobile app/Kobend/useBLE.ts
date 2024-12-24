import { useMemo, useState } from "react";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import * as ExpoDevice from "expo-device";
import { Buffer } from "buffer";

function useBLE() {
  const bleManager = useMemo(() => new BleManager(), []);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [stateBLE, setStateBLE] = useState(""); // Tracks BLE state (e.g., "Connecting", "Writing...", "Success")

  /**
   * Request necessary permissions for BLE.
   */
  const requestAndroid31Permissions = async () => {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];
    const grantedPermissions = await Promise.all(
      permissions.map((perm) =>
        PermissionsAndroid.request(perm, {
          title: "Location Permission",
          message: "Bluetooth Low Energy requires Location",
          buttonPositive: "OK",
        })
      )
    );

    return grantedPermissions.every((result) => result === "granted");
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        return await requestAndroid31Permissions();
      }
    }
    return true;
  };

  /**
   * Start scanning for BLE devices.
   */
  const scanForPeripherals = () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Error during scan:", error);
        return;
      }
      if (
        device &&
        (device.name?.includes("Cube") ||
          device.name?.includes("Led") ||
          device.name?.includes("Fan"))
      ) {
        setAllDevices((prevDevices) =>
          prevDevices.find((d) => d.id === device.id)
            ? prevDevices
            : [...prevDevices, device]
        );
      }
    });
  };

  /**
   * Connect to a BLE device.
   */
  const connectToDevice = async (device: Device) => {
    try {
      setStateBLE("Connecting...");
      const connected = await bleManager.connectToDevice(device.id);
      setConnectedDevice(connected);
      await connected.discoverAllServicesAndCharacteristics();
      bleManager.stopDeviceScan();
      setStateBLE("Connected");
    } catch (error) {
      console.error("Failed to connect:", error);
      setStateBLE("Failed to connect");
    }
  };

  /**
   * Disconnect from the connected BLE device.
   */
  const disconnectFromDevice = () => {
    if (connectedDevice) {
      bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      setStateBLE(""); // Reset BLE state
    }
  };

  /**
   * Write data to a BLE characteristic.
   */
  const writeCharacteristic = async (
    serviceUUID: string,
    characteristicUUID: string,
    data: string
  ): Promise<void> => {
    if (!connectedDevice) {
      throw new Error("No device connected");
    }

    try {
      setStateBLE("Writing...");
      const base64Data = Buffer.from(data, "utf-8").toString("base64");

      // Write data to the characteristic
      await connectedDevice.writeCharacteristicWithResponseForService(
        serviceUUID,
        characteristicUUID,
        base64Data
      );
      console.log("Data sent to characteristic:", data);

      // Monitor the characteristic for acknowledgment
      connectedDevice.monitorCharacteristicForService(
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
          if (error) {
            console.error("Error monitoring characteristic:", error);
            setStateBLE("Failed");
            return;
          }

          if (characteristic?.value) {
            const receivedAck = Buffer.from(
              characteristic.value,
              "base64"
            ).toString("utf-8");
            console.log("Acknowledgment received:", receivedAck);

            if (receivedAck === "Acknowledged") {
              setStateBLE("Writing...");
            } else if (receivedAck === "Invalid") {
              setStateBLE("Failed");
            } else if (receivedAck === "Success") {
              setStateBLE("Success");
              Alert.alert(
                "Write Complete",
                "ESP32 successfully processed the data."
              );
            }
          }
        }
      );
    } catch (error) {
      console.error("Failed to write characteristic:", error);
      setStateBLE("Failed");
      Alert.alert("Error", "Failed to write characteristic. Please try again.");
    }
  };

  return {
    requestPermissions,
    scanForPeripherals,
    connectToDevice,
    disconnectFromDevice,
    writeCharacteristic,
    allDevices,
    connectedDevice,
    stateBLE, // Expose stateBLE
  };
}

export default useBLE;
