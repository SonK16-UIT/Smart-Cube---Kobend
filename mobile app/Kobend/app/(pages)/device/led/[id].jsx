import { View, Text, ActivityIndicator, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AntDesign } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useDevice } from '@/api/devices'; // Add the correct hook for fetching device info
import { useLed, useUpdateLedId } from '@/api/leds'; // Add hooks for LEDs (like dim value)
import { useTheme } from '@/lib/ThemeContext';  // Add the theme context hook

const DeviceDetailScreen = () => {
  const { id } = useLocalSearchParams();  // Get the device id from URL params
  const router = useRouter();

  // Fetch device info using useDevice (device details like name, type, etc.)
  const { data: deviceInfo, error: deviceError, isLoading: deviceLoading } = useDevice(id);

  // Fetch LED properties (like dim value) using useLed
  const { data: led, error: ledError, isLoading: ledLoading } = useLed(Number(id)); 

  const [deviceName, setDeviceName] = useState(deviceInfo?.name || '');
  const [dimValue, setDimValue] = useState(led?.dim || 0); // Use dim value from LED data
  const [validationError, setValidationError] = useState('');

  const { mutate: updateLedDim } = useUpdateLedId();

  const { isDarkMode } = useTheme();  // Use the theme context to get the current theme

  // Set initial dim value when LED data is fetched
  useEffect(() => {
    if (led) {
      setDimValue(led.dim); // Update dim value from LED data
    }
  }, [led]);

  // Set device name if it's available
  useEffect(() => {
    if (deviceInfo) {
      setDeviceName(deviceInfo.name);  // Set device name from device info
    }
  }, [deviceInfo]);

  // Validation for device name
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

  // Handle brightness adjustment slider change
  const handleSliderChange = (value) => {
    const intValue = parseInt(value);
    setDimValue(intValue);
    updateLedDim({ id: Number(id), dim: intValue }); // Update the dim value in the database
    console.log("Updated?: ",intValue);
  };

  // Loading states
  if (deviceLoading || ledLoading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (deviceError || ledError) {
    return <Text>Error loading device details or LED properties</Text>;
  }

  if (!deviceInfo || !led) {
    return <Text>Device or LED not found</Text>;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1A1A2E' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('home')}>
          <AntDesign name="arrowleft" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Home</Text>
      </View>

      <Text style={[styles.title, { color: isDarkMode ? 'white' : 'black' }]}>Device Details</Text>
      <Text style={[styles.deviceInfo, { color: isDarkMode ? 'white' : 'black' }]}>Device Type: {deviceInfo.device_type}</Text>
      <Text style={[styles.deviceInfo, { color: isDarkMode ? 'white' : 'black' }]}>Status: {deviceInfo.status}</Text>
      <Text style={[styles.deviceInfo, { color: isDarkMode ? 'white' : 'black' }]}>Status: {deviceName}</Text>

      {/* <TextInput
        style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#FFF', color: isDarkMode ? '#FFF' : '#333' }]}
        placeholder="Enter device name"
        placeholderTextColor={isDarkMode ? 'gray' : 'lightgray'}
        value={deviceName}
        onChangeText={(text) => {
          setDeviceName(text);
          validateDeviceName(text);
        }}
      /> */}

      <Text style={[styles.sidesTitle, { color: isDarkMode ? 'white' : 'black' }]}>Adjust Brightness</Text>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={0}
        maximumValue={100}
        minimumTrackTintColor="#FFFFFF"
        maximumTrackTintColor="#000000"
        thumbTintColor="#F8757C"
        value={dimValue} // Bind the slider value to dimValue
        onValueChange={handleSliderChange} // Update dim value on change
      />
      {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    padding: 16,
  },
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
    backgroundColor: '#1A1A2E',
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
};

export default DeviceDetailScreen;
