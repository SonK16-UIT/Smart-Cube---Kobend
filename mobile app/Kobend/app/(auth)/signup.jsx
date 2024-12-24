import { View, Text, TextInput, Image, Pressable, StyleSheet, Alert } from 'react-native';
import React, { useState } from 'react';
import Button from '../../components/Button';
import Colors from '../../constants/Colors';
import { Link, Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import AntDesign from '@expo/vector-icons/AntDesign';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Account created successfully! Please check your email to verify your account.');
        router.replace('/(auth)/signin'); // Redirect to the sign-in page
      }
    } catch (err) {
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ paddingTop: hp(22), paddingHorizontal: wp(5),backgroundColor: '#1F233A' }} className="flex-1 gap-50">
      <Stack.Screen options={{ title: 'Sign up', headerShown: false }} />
      <View className="items-center">
        <Image
          style={{ height: hp(20)}}
          resizeMode="contain"
          source={require('../../assets/images/register.png')}
        />
      </View>

      <View className="gap-10">
        <View className="gap-4">
        <Text style={styles.label}>Email</Text>
        <View style={{ height: hp(7) }} className="flex-row gap-4 px-4 bg-slate-950 items-center rounded-2xl">
          <AntDesign name="mail" size={hp(2.5)} color="gray" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="gray"
            style={styles.input}
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={{ height: hp(7) }} className="flex-row gap-4 px-4 bg-slate-950 items-center rounded-2xl">
          <AntDesign name="lock" size={hp(2.5)} color="gray" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="gray"
            style={styles.input}
            secureTextEntry
          />
        </View>
      </View>

      <Button
        onPress={signUpWithEmail}
        disabled={loading}
        text={loading ? 'Creating account...' : 'Create account'}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
        <Text style={{ fontSize: hp(1.8), color: 'gray' }}>Already have an account?</Text>
        <Pressable onPress={() => router.push('/(auth)/signin')} >
          <Text style={{ fontSize: hp(1.8), marginLeft: 5, color: Colors.light.tint }}>
            Sign in
          </Text>
        </Pressable>
      </View>
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: hp(2),
    color: 'white',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2E45',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: hp(2),
    color: 'white',
    marginLeft: 10,
  },
});

export default SignUpScreen;