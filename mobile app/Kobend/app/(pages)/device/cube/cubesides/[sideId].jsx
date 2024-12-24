import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useCubeSides, useUpdateCubeSideOne, useUpdateCubeSideMultiple } from '@/api/cubesides';
import { AntDesign } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import { useDeviceList } from '@/api/devices';
import { useAuth } from '@/providers/AuthProvider';


export default function CubeSideDetailScreen() {
  const router = useRouter();
  const { sideId } = useLocalSearchParams();
  const { session, loading , profile } = useAuth();

  const { data: cubeSide, error: cubeSideError, isLoading: cubeSideLoading } = useCubeSides(sideId);
  const { data: deviceList, error: deviceListError, isLoading: deviceListLoading } = useDeviceList(profile?.id);
  
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [modeValue, setModeValue] = useState(null);
  const [actionValues, setActionValues] = useState([]);
  const [deviceType, setDeviceType] = useState(null);

  const updateCubeSideOne = useUpdateCubeSideOne();
  const updateCubeSideMultiple = useUpdateCubeSideMultiple();

  useEffect(() => {
    if (cubeSide) {
      const initialMode = cubeSide.action_type === 'multiple' ? '2' : '1';
      setModeValue(initialMode);
      setActionValues(initialMode === '2' ? Array(3).fill(null) : [null]);
    }
  }, [cubeSide]);

  if (cubeSideLoading || deviceListLoading) return <ActivityIndicator size="large" color="#0000ff" />;
  if (cubeSideError || deviceListError) return <Text>Error loading data</Text>;

  const handleDeviceChange = (device) => {
    setSelectedDevice(device.value);
    setDeviceType(device.value.device_type);
    setModeValue(null); // Reset mode
    setActionValues([]); // Clear action selections when device changes
  };

  const handleModeChange = (item) => {
    setModeValue(item.value); // Set the mode value
    setActionValues(item.value === '2' ? Array(3).fill(null) : [null]); // Initialize action values
  };

  const actionOptions = deviceType === 'fan'
    ? [
        { label: 'Increase Speed', value: { speed: 'increase' } },
        { label: 'Decrease Speed', value: { speed: 'decrease' } }
      ]
    : [
        { label: 'Increase Dim', value: { dim: 'increase' } },
        { label: 'Decrease Dim', value: { dim: 'decrease' } }
      ];

  const handleSubmit = () => {
    if (modeValue === '1') {
      updateCubeSideOne.mutate(
        {
          id: sideId,
          action_type: 'one',
          toggle: { status: actionValues[0], device_id: selectedDevice?.id },
        },
        {
          onSuccess: () => alert("Update successful!"),
          onError: (error) => alert("Update failed: " + error.message),
        }
      );
    } else if (modeValue === '2') {
      updateCubeSideMultiple.mutate(
        {
          sideId,
          actionValues,
          selectedDeviceId: selectedDevice?.id,
        },
        {
          onSuccess: () => alert("Update successful!"),
          onError: (error) => alert("Update failed: " + error.message),
        }
      );
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace(`/device/cube/${cubeSide.cube_id}`)}>
          <AntDesign name="arrowleft" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Cube Side Details</Text>
      </View>
      
      {/* Make sure the ScrollView contains all the content you want to be scrollable */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Side Details</Text>
        <Text style={{ fontSize: 16, marginTop: 10 }}>Side Name: {cubeSide.side_name}</Text>
        <Text style={{ fontSize: 16, marginTop: 10 }}>Action Type: {cubeSide.action_type || 'No action'}</Text>

        <View style={styles.container}>
          <Text style={styles.label}>Device List</Text>
          <Dropdown
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            style={styles.dropdown}
            data={deviceList
              ?.filter(device => device.device_type === 'led' || device.device_type === 'fan')
              .map(device => ({
                label: device.name,
                value: device,
              })) || []
            }
            labelField="label"
            valueField="label"
            placeholder="Select device"
            value={selectedDevice?.name || null}
            onChange={handleDeviceChange}
          />
        </View>

        {selectedDevice && (
          <View style={styles.container}>
            <Text style={styles.label}>Mode</Text>
            <Dropdown
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              style={styles.dropdown}
              data={[
                { label: 'One', value: '1' },
                { label: 'Multiple', value: '2' }
              ]}
              labelField="label"
              valueField="value"
              placeholder="Select mode"
              value={modeValue}
              onChange={handleModeChange}
            />
          </View>
        )}

        {selectedDevice && modeValue === '1' && (
          <Dropdown
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            style={styles.dropdown}
            data={[
              { label: 'ON', value: 'ON' },
              { label: 'OFF', value: 'OFF' }
            ]}
            labelField="label"
            valueField="value"
            placeholder="Select action"
            value={actionValues[0] || null}
            onChange={(item) => setActionValues([item.value])}
          />
        )}

        {selectedDevice && modeValue === '2' &&
          ['Shake', 'Clockwise', 'Counter Clockwise'].map((label, index) => (
            <View key={index} style={styles.container}>
              <Text style={styles.label}>{label}</Text>
              <Dropdown
                style={styles.dropdown}
                data={actionOptions}
                placeholderStyle={styles.placeholderStyle}
                inputSearchStyle={styles.inputSearchStyle}
                selectedTextStyle={styles.selectedTextStyle}
                labelField="label"
                valueField="value"
                placeholder={`Select ${label.toLowerCase()}`}
                value={actionValues[index]?.speed === 'increase' || actionValues[index]?.dim === 'increase'
                  ? 'Increase ' + (deviceType === 'fan' ? 'Speed' : 'Dim')
                  : actionValues[index]?.speed === 'decrease' || actionValues[index]?.dim === 'decrease'
                  ? 'Decrease ' + (deviceType === 'fan' ? 'Speed' : 'Dim')
                  : null
                }
                onChange={(item) => {
                  const updatedActions = [...actionValues];
                  updatedActions[index] = item.value;
                  setActionValues(updatedActions);
                }}
              />
            </View>
          ))
        }

        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = {
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
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
    backgroundColor: '#1F233A',
  },
  container: {
    backgroundColor: 'white',
    padding: 16,
  },
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    color: 'blue',
  },
  submitButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  submitText: {
    color: 'white',
    fontWeight: 'bold',
  },
};
