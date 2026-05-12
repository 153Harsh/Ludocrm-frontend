import React, { useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";
import bgImg from "../assets/newAssets/Layer1copy.png";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { API_BASE_URL, authHeaders } from '../api';
import { useAuth } from './AuthContext';
const { width: W, height: H } = Dimensions.get('window');
const s = (size: number) => (W / 390) * size;
const LoginScreen = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setSession } = useAuth();
const [alertConfig, setAlertConfig] = useState({
  visible: false,
  title: '',
  message: '',
  type: 'success',
});
const showAlert = (
  title: string,
  message: string,
  type: 'success' | 'error' | 'warning' = 'success',
) => {
  setAlertConfig({
    visible: true,
    title,
    message,
    type,
  });
};
  const handleLogin = async () => {
    const trimmedUserId = userId.trim();

    if (!trimmedUserId || !password) {
      showAlert('Login Required', 'Please enter your user ID and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: trimmedUserId,
          password,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        showAlert('Login Failed', json.message || 'Please check your credentials.');
        return;
      }

      setSession({
        token: json.token,
        user: json.user,
        currentBoard: json.currentBoard,
      });
      navigation.reset({
        index: 0,
        routes: [{ name: 'dashboard' }],
      });
    } catch (error) {
      showAlert(
        'Login Failed',
        error instanceof Error ? error.message : 'Unable to connect to server.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0B132B", "#1C2541"]}
      style={styles.container}
    >
      <Image
        source={bgImg}
        style={{ position: "absolute", width: "100%", height: "100%", resizeMode:"cover" }}
      />
      <LinearGradient
        colors={["#7F4BE2", "#9F6BFF"]}
        style={styles.card}
      >
        <TextInput
          placeholder="MR ID / User ID"
          placeholderTextColor="#ddd"
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="characters"
          autoCorrect={false}
        />


        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#ddd"
            secureTextEntry={!passwordVisible}
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Icon
              name={passwordVisible ? "visibility-off" : "visibility"}
              size={20}
              color="#ddd"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
      {alertConfig.visible && (
  <View style={styles.alertOverlay}>
    <View
      style={[
        styles.alertBox,
        alertConfig.type === 'success' && styles.successAlert,
        alertConfig.type === 'error' && styles.errorAlert,
        alertConfig.type === 'warning' && styles.warningAlert,
      ]}
    >
      <Icon
        name={
          alertConfig.type === 'success'
            ? 'check-circle'
            : alertConfig.type === 'error'
            ? 'error'
            : 'warning'
        }
        size={45}
        color="white"
      />

      <Text style={styles.alertTitle}>
        {alertConfig.title}
      </Text>

      <Text style={styles.alertMessage}>
        {alertConfig.message}
      </Text>

      <TouchableOpacity
        style={styles.alertButton}
        onPress={() =>
          setAlertConfig(prev => ({
            ...prev,
            visible: false,
          }))
        }
      >
        <Text style={styles.alertButtonText}>
          OK
        </Text>
      </TouchableOpacity>
    </View>
  </View>
)}
    </LinearGradient>
  );
};

export default LoginScreen;

const styles = StyleSheet.create<Record<string, any>>({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  tagline: {
    color: "#ccc",
    marginBottom: s(40),
  },
  card: {
    width: "90%",
    height: "30%",
    marginTop: "12%",
    padding: s(25),
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: s(12),
    marginBottom: s(15),
    height: s(50),
    width: "100%",
    color: "#fff",
    fontSize: 18,
  },
  passwordContainer: {
    height: s(50),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: s(12),
    marginBottom: s(20),
  },
  passwordInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 12,
    fontSize: 18,
  },
  button: {
    backgroundColor: "#1C2541",
    padding: s(12),
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    height: s(50),
    width: "40%",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
 alertOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.65)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
},

alertBox: {
  width: '82%',
  height: '20%',
  borderRadius: 24,
  paddingHorizontal: 25,
  paddingVertical: 25,
  alignItems: 'center',
  borderWidth:2,
  borderColor:'white'
},

successAlert: {
  backgroundColor: '#000f84',
},

errorAlert: {
  backgroundColor: '#000f84',
},

warningAlert: {
  backgroundColor: '#1b339f',
},

alertTitle: {
  color: 'white',
  fontSize: 22,
  fontWeight: 'bold',
  marginTop: 12,
},

alertMessage: {
  color: 'white',
  fontSize: 15,
  textAlign: 'center',
  marginTop: 10,
  lineHeight: 22,
},

alertButton: {
  marginTop: 20,
  backgroundColor: 'rgba(255,255,255,0.2)',
  paddingHorizontal: 30,
  paddingVertical: 10,
  borderRadius: 15,
},

alertButtonText: {
  color: 'white',
  fontWeight: 'bold',
  fontSize: 15,
},
});
