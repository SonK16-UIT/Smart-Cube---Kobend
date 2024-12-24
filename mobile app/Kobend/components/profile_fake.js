mport React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useUser, useUpdateAvatar, uploadAvatar } from "@/api/profiles";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { AntDesign } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";

import * as FileSystem from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { decode } from 'base64-arraybuffer';

const ProfileScreen = () => {
  const { session, loading, profile } = useAuth();
  const { isDarkMode } = useTheme();
  const { data: userData, isLoading, isError } = useUser(profile?.id);
  const updateAvatarMutation = useUpdateAvatar();
  const [image, setImage] = useState(null);

  // Local state for form data
  const [form, setForm] = useState({
    username: "",
    website: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (userData) {
      setForm({
        username: userData.username || "",
        website: userData.website || "",
        avatar_url: userData.avatar_url || "",
      });
    }
  }, [userData]);

  // Loading state
  if (loading || isLoading) {
    return <ActivityIndicator />;
  }

  // Redirect if not authenticated
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  // Error handling
  if (isError) {
    return <Text>Error loading profile data.</Text>;
  }

  const uploadImage = async () => {
    if (!image?.startsWith('file://')) {
      return;
    }

    const base64 = await FileSystem.readAsStringAsync(image, {
      encoding: 'base64',
    });
    const filePath = ${randomUUID()}.png;
    const contentType = 'image/png';

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, decode(base64), { contentType });

    console.log(error);

    if (data) {
      return data.path;
    }
  };
  // Handle image selection and uploading
  const handleImageSelection = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
    // if (!result.canceled && result.assets && result.assets.length > 0) {
    //   const image = result.assets[0];
    //   try {
    //     const { filePath } = await uploadAvatar(image); // Upload avatar to Supabase storage
    //     await updateAvatarMutation.mutateAsync({ id: profile.id, avatarPath: filePath }); // Update avatar URL in the database
    //     setForm((prev) => ({ ...prev, avatar_url: filePath })); // Update local state
    //     Alert.alert("Success", "Avatar updated successfully!");
    //   } catch (error) {
    //     console.error("Error updating avatar:", error);
    //     Alert.alert("Error", "Failed to upload avatar.");
    //   }
    // }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDarkMode ? "#1A1A2E" : "#FFFFFF" }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: "https://picsum.photos/seed/696/3000/2000" }}
            style={styles.bannerImage}
          />
        </View>

        <View style={styles.profileHeader}>
          {/* Avatar Section */}
          <TouchableOpacity onPress={handleImageSelection} style={styles.imageContainer}>
            <Image
              source={{ uri: form.avatar_url || "https://via.placeholder.com/100" }}
              style={styles.profileImage}
            />
            <View style={styles.cameraIcon}>
              <AntDesign name="camera" size={18} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Form */}
        <TextInput
          placeholder="Username"
          placeholderTextColor={isDarkMode ? "gray" : "darkgray"}
          value={form.username}
          onChangeText={(text) => setForm((prev) => ({ ...prev, username: text }))}
          style={[styles.input, { backgroundColor: isDarkMode ? "#2A2E45" : "#F7F7F7", color: isDarkMode ? "white" : "black" }]}
        />

        <TextInput
          placeholder="Website"
          placeholderTextColor={isDarkMode ? "gray" : "darkgray"}
          value={form.website}
          onChangeText={(text) => setForm((prev) => ({ ...prev, website: text }))}
          style={[styles.input, { backgroundColor: isDarkMode ? "#2A2E45" : "#F7F7F7", color: isDarkMode ? "white" : "black" }]}
        />

        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={[styles.logoutButton, { backgroundColor: isDarkMode ? "#444" : "#DDD" }]}
        >
          <Text style={{ color: isDarkMode ? "white" : "black", fontWeight: "bold" }}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    alignItems: "center",
    padding: 0,
  },
  bannerContainer: {
    width: "100%",
  },
  bannerImage: {
    height: 228,
    width: "100%",
  },
  profileHeader: {
    alignItems: "center",
  },
  imageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  profileImage: {
    height: 100,
    width: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#ccc",
    marginTop: -50,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#007BFF",
    borderRadius: 12,
    padding: 4,
  },
  input: {
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    width: "90%",
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
});

export default ProfileScreen;