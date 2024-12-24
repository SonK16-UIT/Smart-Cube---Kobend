import { useRouter } from "expo-router";
import { Tables } from '../types'; // Make sure this has the correct type for 'devices'
import { Pressable, Text, StyleSheet, View, Switch } from 'react-native';
import { AntDesign, FontAwesome, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useUpdateDeviceId, useDeleteDeviceId } from '@/api/devices/index'; // Make sure you import useDeleteDeviceId
import { QueryClient } from "@tanstack/react-query";

type DeviceListItemProps = {
  device: Tables<'devices'>;
};

const DeviceListItem = ({ device }: DeviceListItemProps) => {
  const router = useRouter();
  const { mutate: updateDeviceStatus } = useUpdateDeviceId(); // Destructure mutation function from the hook
  const { mutate: deleteDevice } = useDeleteDeviceId(); // Mutation for deleting the device (updating user_id to null)

  const getDeviceLink = () => {
    switch (device.device_type) {
      case 'led':
        return `/device/led/${device.id}`;
      case 'fan':
        return `/device/fan/${device.id}`;
      case 'cube':
        return `/device/cube/${device.id}`;
      default:
        return `/device/${device.id}`; // fallback in case of unknown type
    }
  };

  const handlePress = () => {
    router.replace(getDeviceLink());
  };

  const toggleSwitch = (device: Tables<'devices'>) => {
    const newStatus = device.status === 'ON' ? 'OFF' : 'ON';
    updateDeviceStatus({ id: device.id, status: newStatus }, {});
  };

  const deleteItem = (device: Tables<'devices'>) => {
    // Update the user_id field to null
    deleteDevice({ id: device.id, user_id: null });
  };

  return (
    <View style={styles.boxContainer}>
      <Pressable onPress={handlePress}>
        <View style={styles.deviceBox}>
          <View style={styles.flexRow}>
            {device.device_type === 'led' ? (
              <FontAwesome name="lightbulb-o" size={20} color={device.status === 'ON' ? "white" : "#555"} />
            ) : device.device_type === 'fan' ? (
              <FontAwesome5 name="fan" size={20} color={device.status === 'ON' ? "white" : "#555"} />
            ) : device.device_type === 'cube' ? (
              <Ionicons name="cube-sharp" size={20} color={device.status === 'ON' ? "white" : "#555"} />
            ) : null}
            <Pressable onPress={() => deleteItem(device)}>
              <AntDesign name="delete" size={20} color="white" />
            </Pressable>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.deviceLabel}>
              {device.device_type
                ? device.device_type.charAt(0).toUpperCase() + device.device_type.slice(1)
                : 'Unknown Type'}
            </Text>
          </View>
          <View style={styles.flexRow}>
            <Text style={styles.deviceId}>{device.name || 'Unnamed Device'}</Text>
            <Switch
              value={device.status === 'ON'}
              onValueChange={() => toggleSwitch(device)} // Trigger toggle on switch change
              thumbColor={device.status === 'ON' ? "#F8757C" : "#E1E1E1"}
            />
          </View>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  boxContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 10,
    marginVertical: 8, // Adjust spacing between cards
  },
  deviceBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#3A3F4A',
    justifyContent: 'space-between',
    height: 120,
  },
  flexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  deviceLabel: {
    fontSize: 14,
    color: '#A0A3BD',
    textAlign: 'center',
    marginVertical: 4,
  },
  deviceId: {
    fontSize: 12,
    color: 'gray',
    marginRight: 5,
  },
});

export default DeviceListItem;
