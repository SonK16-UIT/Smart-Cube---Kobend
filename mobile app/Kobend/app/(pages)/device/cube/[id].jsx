import { View, Text, ActivityIndicator, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDevice } from '@/api/devices';
import { useEffect, useState } from 'react';
import { useCube } from '@/api/cubes';
import { useCubeSidesList } from '@/api/cubesides';
import { AntDesign } from '@expo/vector-icons'; // Corrected import
import CubeListItem from '@/components/CubeListItem';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CubeDetailScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { data: device, error: deviceError, isLoading: deviceLoading } = useDevice(id);
  const { data: cube, error: cubeError, isLoading: cubeLoading } = useCube(id);
  const { data: cubeSides, error: cubeSidesError, isLoading: cubeSidesLoading } = useCubeSidesList(id);

  const [deviceName, setDeviceName] = useState(device?.name || '');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (device) {
      setDeviceName(device.name);
    }
  }, [device]);

  if (deviceLoading || cubeLoading || cubeSidesLoading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (deviceError || cubeError || cubeSidesError) {
    return <Text className="text-center text-red-500 mt-4">Error loading device or cube details</Text>;
  }

  if (!device) {
    return <Text className="text-center text-gray-500 mt-4">Device not found</Text>;
  }

  return (
  <View
    className="flex-1"
    style={{
      paddingTop: top + 10,
      backgroundColor: isDarkMode ? '#1A1A2E' : '#FFFFFF',
    }}
  >
    <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <View className="flex-row items-center p-5" style={{ backgroundColor: isDarkMode ? '#1F233A' : '#F0F0F0' }}>
        <Pressable onPress={() => router.replace('home')}>
          <AntDesign name="arrowleft" size={24} color={isDarkMode ? "white" : "black"} />
        </Pressable>
        <Text className={`ml-3 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Home</Text>
      </View>

      {/* Main Content */}
      <View className="p-4">
        <Text className={`${isDarkMode ? 'text-white' : 'text-black'} text-2xl font-bold mb-4`}>Device Details</Text>
        <Text className={`${isDarkMode ? 'text-white' : 'text-black'} text-lg mb-2`}>Device Type: {device.device_type}</Text>
        <Text className={`${isDarkMode ? 'text-white' : 'text-black'} text-lg mb-2`}>Status: {device.status}</Text>

        <Text className={`${isDarkMode ? 'text-white' : 'text-black'} text-xl font-bold mt-5 mb-3`}>Sides:</Text>

        {cubeSides?.length > 0 ? (
          <FlatList
            data={cubeSides}
            numColumns={2}
            renderItem={({ item }) => <CubeListItem side={item} />}
            keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={{ padding: 8 }} // Corrected to an object
          />
        ) : (
          <Text className="text-gray-500 text-center mt-4">No sides available</Text>
        )}
      </View>
    </View>
    </View>
  );
};

export default CubeDetailScreen;
