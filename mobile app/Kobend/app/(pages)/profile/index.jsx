import React, { useState, useEffect } from "react";
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
import { useUser } from "@/api/profiles";
import * as ImagePicker from "expo-image-picker";
import { AntDesign } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import RemoteImage from "@/components/RemoteImage"; // Import your RemoteImage component
import * as FileSystem from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { decode } from "base64-arraybuffer";
import { useTheme } from "@/lib/ThemeContext";
import { Image } from "expo-image";

const ProfileScreen = () => {
  const { session, loading, profile } = useAuth();
  const { data: userData, isLoading, isError } = useUser(profile?.id);

  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (userData) {
      setName(userData.username || "");
      setImage(userData.avatar_url || null); // Use avatar_url for RemoteImage
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

  // Handle image selection
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
  };

  // Upload the image to Supabase storage
  const uploadImage = async () => {
    if (!image?.startsWith("file://")) {
      return null;
    }

    const base64 = await FileSystem.readAsStringAsync(image, {
      encoding: "base64",
    });
    const filePath = `${randomUUID()}.png`;
    const contentType = "image/png";

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, decode(base64), { contentType });

    if (error) {
      console.error("Error uploading image:", error.message);
      return null;
    }

    return data.path;
  };

  // Submit the name and image
  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }

    try {
      const imagePath = await uploadImage();

      const { error } = await supabase
        .from("profiles")
        .update({ username: name, avatar_url: imagePath })
        .eq("id", profile.id);

      if (error) {
        console.error("Error saving profile:", error.message);
        Alert.alert("Error", "Failed to update profile");
      } else {
        Alert.alert("Success", "Profile updated successfully");
        setImage(imagePath); // Update image path for RemoteImage
      }
    } catch (err) {
      console.error("Unexpected error:", err.message);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDarkMode ? "#1A1A2E" : "#FFFFFF" }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: "https://picsum.photos/seed/696/3000/2000" }}
            style={styles.bannerImage}
          />
        </View>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleImageSelection} style={styles.imageContainer}>
            <RemoteImage
              path={image} // Use the image path
              fallback="https://via.placeholder.com/100" // Fallback image
              style={styles.profileImage}
            />
            <View style={styles.cameraIcon}>
              <AntDesign name="camera" size={18} color="white" />
            </View>
          </TouchableOpacity>
        </View>
        {/* Name Input */}
        <TextInput
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          style={[styles.input, { backgroundColor: isDarkMode ? "#2A2E45" : "#F7F7F7", color: isDarkMode ? "white" : "black" }]}
        />

        {/* Submit Button */}
        <Pressable onPress={handleSubmit} style={[styles.submitButton, { marginBottom: 10 }]}>
          <Text style={styles.submitText}>Save Changes</Text>
        </Pressable>

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
  bannerImage: {
    height: 228,
    width: "100%",
  },
  profileHeader: {
    alignItems: "center",
  },
  bannerContainer: {
    width: "100%",
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    alignItems: "center",
    padding: 0,
  },
  imageContainer: {
    marginBottom: 20,
    position: "relative",
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
    width: "100%",
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  submitText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  logoutButton: {
    padding: 15,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
});

export default ProfileScreen;
