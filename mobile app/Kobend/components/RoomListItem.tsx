// RoomListItem.tsx
import { useSegments, Link } from "expo-router";
import { Tables } from '../types';
import { Pressable, Text, StyleSheet } from 'react-native';

type RoomListItemProps = {
  room: Tables<'rooms'>;
};

const RoomListItem = ({ room }: RoomListItemProps) => {
  return (
    <Link href={`/room/${room.id}`} asChild>
      <Pressable style={styles.roomBox}>
        <Text style={styles.roomText}>{room.room_name || 'Unnamed Room'}</Text>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  roomBox: {
    padding: 15,
    marginVertical: 10,
    marginHorizontal: 20,
    backgroundColor: '#ADD8E6',
    borderRadius: 8,
    alignItems: 'center',
  },
  roomText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default RoomListItem;
