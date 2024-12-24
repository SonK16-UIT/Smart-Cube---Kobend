import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

const CubeListItem = ({ side }) => {
  const router = useRouter();

  const handlePress = () => {
    router.replace(`/device/cube/cubesides/${side.id}`);
  };

  return (
    <Pressable 
      onPress={handlePress} 
      className="w-[48%] p-4 rounded-lg my-2 items-center"
      style={{backgroundColor: '#3A3F4A'}}
    >
      <Text className="text-lg font-bold text-white">{side.side_name || 'Unnamed Side'}</Text>
      <Text className="text-sm text-gray-400">{side.action_type || 'No action'}</Text>
    </Pressable>
  );
};

export default CubeListItem;
