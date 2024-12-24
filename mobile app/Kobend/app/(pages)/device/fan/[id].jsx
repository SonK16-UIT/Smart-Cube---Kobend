import { View, Text, ActivityIndicator, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDevice } from '@/api/devices'; // Adjust to use device-specific hooks
import { useEffect, useState } from 'react';
import { AntDesign } from '@expo/vector-icons';

const sides = [
  { name: "Top", actionType: "one" },
  { name: "Bottom", actionType: "multiple" },
  { name: "Left", actionType: "" },
  { name: "Right", actionType: "" },
  { name: "Front", actionType: "" },
  { name: "Back", actionType: "" },
];

const DeviceDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { data: device, error, isLoading } = useDevice(id);

  const [deviceName, setDeviceName] = useState(device?.name || '');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (device) {
      setDeviceName(device.name); // Set initial device name when data loads
    }
  }, [device]);

  const validateDeviceName = (name) => {
    if (!name) {
      setValidationError('Device name cannot be empty.');
      return false;
    }
    if (name.length < 3) {
      setValidationError('Device name must be at least 3 characters long.');
      return false;
    }
    setValidationError('');
    return true;
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text>Error loading device details</Text>;
  }

  if (!device) {
    return <Text>Device not found</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('home')}>
          <AntDesign name="arrowleft" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Home</Text>
      </View>
      <Text style={styles.title}>Device Details</Text>
      <Text style={styles.deviceInfo}>Device Type: {device.device_type}</Text>
      <Text style={styles.deviceInfo}>Status: {device.status}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter device name"
        placeholderTextColor="gray"
        value={deviceName}
        onChangeText={(text) => {
          setDeviceName(text);
          validateDeviceName(text);
        }}
      />
      {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
    </View>
  );
};

const styles = {
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#1F233A',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  deviceInfo: {
    fontSize: 16,
    marginVertical: 4,
  },
  input: {
    width: '100%',
    padding: 10,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    color: '#333',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  sidesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  sidesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sideBox: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    marginVertical: 8,
    alignItems: 'center',
  },
  sideText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sideAction: {
    fontSize: 14,
    color: '#555',
  },
};

export default DeviceDetailScreen;
