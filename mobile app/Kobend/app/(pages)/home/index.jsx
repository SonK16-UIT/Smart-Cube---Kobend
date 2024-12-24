import { View, Text, ActivityIndicator, FlatList, Pressable, TextInput, Alert, Switch } from 'react-native';
import React, { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useDeviceList } from '@/api/devices/index';
import CustomModal from '@/components/CustomModal';
import { AntDesign } from '@expo/vector-icons';
import DeviceListItem from '@/components/DeviceListItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { useUpdateDeviceSubscription } from '@/api/devices/subscription';

const HomePage = () => {
  const { top } = useSafeAreaInsets();
  const { session, loading, profile } = useAuth();
  const { data: devices, error: deviceError, isLoading: deviceLoading } = useDeviceList(profile?.id);
  const [showModal, setShowModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const { isDarkMode, toggleTheme } = useTheme();
  
  useUpdateDeviceSubscription();  // This hook will update when the device data changes

  // If the data is loading
  if (deviceLoading) {
    return <ActivityIndicator />;
  }

  // If there's an error fetching the devices
  if (deviceError) {
    return <Text className="text-center text-red-500 mt-4">Failed to fetch data</Text>;
  }

  // Sort devices by id to ensure consistent ordering
  const sortedDevices = devices?.sort((a, b) => a.id - b.id);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'Please enter a valid room name.');
      return;
    }
  };

  return (
    <View
      className="flex-1"
      style={{
        paddingTop: top + 10,
        backgroundColor: isDarkMode ? '#1A1A2E' : '#FFFFFF',
      }}
    >
      <View className="flex-1 p-4">
        <View className="flex-row justify-center items-center mb-4">
          <Text className={`text-xl ${isDarkMode ? 'text-white' : 'text-black'}`}>Toggle Theme</Text>
          <Switch value={isDarkMode} onValueChange={toggleTheme} />
        </View>

        <View className="flex-row justify-between items-center mb-2">
          <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Your Devices:</Text>
          {/* <Pressable className="bg-gray-500 py-2 px-4 rounded-full" onPress={() => setShowModal(true)}>
            <Text className="text-white font-bold">Add Room</Text>
          </Pressable> */}
        </View>

        {sortedDevices?.length > 0 ? (
          <FlatList
            data={sortedDevices}  // Pass sorted devices here
            renderItem={({ item }) => <DeviceListItem device={item} />}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 8 }}
          />
        ) : (
          <Text className="text-gray-500 text-center mt-4">No devices available</Text>
        )}
      </View>

      <CustomModal isOpen={showModal} withInput>
        <View className="bg-gray-800 p-4 rounded-lg w-full">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">Create Room</Text>
            <Pressable onPress={() => setShowModal(false)} className="p-1">
              <AntDesign name="close" size={25} color="white" />
            </Pressable>
          </View>
          <Text className="text-gray-400 mb-2">Enter Room Name</Text>
          <TextInput
            className="bg-gray-700 text-white p-3 rounded-lg mb-4"
            placeholder="Enter room name"
            placeholderTextColor="gray"
            value={roomName}
            onChangeText={setRoomName}
          />
          <Pressable onPress={handleCreateRoom} className="bg-green-600 p-3 rounded-lg">
            <Text className="text-white font-bold text-center">Create</Text>
          </Pressable>
        </View>
      </CustomModal>
    </View>
  );
};

export default HomePage;
