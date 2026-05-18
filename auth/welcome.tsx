import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import bgImg from '../assets/newAssets/Layer1copy.png';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
};
const { width: W, height: H } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <Image source={bgImg} style={styles.bgImage} />

      <TouchableOpacity
        style={styles.buttonWrapper}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#5d28be', '#5d25c5', '#a17ee3', '#b58dff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Let's Get Started</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H,
    resizeMode: 'cover',
  },
  buttonWrapper: {
    position: 'absolute',
    // left: s(24),
    // right: s(24),/
    bottom: s(56),
    width: "50%",
    borderRadius: 8,
    overflow: 'hidden',
    borderColor: '#bfbfbf',
    borderWidth: 1,
    alignItems: 'center',
  },
  button: {
    // paddingHorizontal: s(30),
    paddingVertical: s(12),
    borderRadius: 8,
    width: "100%",
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: s(16),
    fontWeight: '600',
    textAlign: 'center',
  },
});
