import { View, Text, Image, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import React, { useState } from 'react';
import Button from '../../components/Button';
import Colors from '../../constants/Colors';
import { Link, Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import AntDesign from '@expo/vector-icons/AntDesign';

const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'You are now signed in!');
        router.replace('/home'); // Redirect to the home screen on successful login
      }
    } catch (err) {
      Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ paddingTop: hp(22), paddingHorizontal: wp(5), backgroundColor: '#1F233A' }} className="flex-1 gap-50">
      <Stack.Screen options={{ title: 'Sign in', headerShown: false }} />
      <View className="items-center">
        <Image
          style={{ height: hp(25) }}
          resizeMode="contain"
          source={require('../../assets/images/login.png')}
        />
      </View>

      <View style={{ marginBottom: 20 }}>
        <Text style={styles.label}>Email</Text>
        <View style={{ height: hp(7) }} className="flex-row gap-4 px-4 bg-slate-950 items-center rounded-2xl">
          <AntDesign name="mail" size={hp(2.5)} color="gray" />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="gray"
            style={{ fontSize: hp(2), color: 'white'}}
            className="flex-1 font-semibold text-neutral-700"
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View className="gap-3">
        <View style={{ height: hp(7) }} className="flex-row gap-4 px-4 bg-slate-950 items-center rounded-2xl">
          <AntDesign name="lock" size={hp(2.5)} color="gray" />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="gray"
            style={{ fontSize: hp(2), color: 'white'}}
            secureTextEntry
            className="flex-1 font-semibold text-neutral-700"
          />
        </View>
      </View>
      </View>

      <Button
        onPress={signInWithEmail}
        disabled={loading}
        text={loading ? 'Signing in...' : 'Sign in'}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
        <Text style={{ fontSize: hp(1.8), color: 'gray' }}>Don't have an account? </Text>
        <Link href="/(auth)/signup" style={{ fontSize: hp(1.8)}} className="font-semibold text-cyan-300">
        <Text style={{ fontSize: hp(1.8), marginLeft: 5, color: Colors.light.tint }}>
            Create one
          </Text>
        </Link>
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

export default SignInScreen;