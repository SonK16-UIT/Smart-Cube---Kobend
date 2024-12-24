import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import AntDesign from '@expo/vector-icons/AntDesign';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ble/bluetooth"
        options={{
          title: 'Add Device',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="bluetooth" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color }) => <AntDesign name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="device/cube/[id]"
        options={{
            headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="device/cube/cubesides/[sideId]"
        options={{
            headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="device/fan/[id]"
        options={{
            headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="device/led/[id]"
        options={{
            headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}
