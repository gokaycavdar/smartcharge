import React, { useState } from 'react';
import { View, Text, Alert, SafeAreaView } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { Rocket, Zap } from 'lucide-react-native';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { API_URL } from '../config';

const StyledView = styled(View);
const StyledText = styled(Text);

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('driver@test.com');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email) {
      Alert.alert('Hata', 'Lütfen e-posta girin');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      if (data.user.role !== 'DRIVER') {
        Alert.alert('Erişim Reddedildi', 'Bu uygulama sadece sürücüler içindir.');
        return;
      }

      navigation.replace('DriverHome', { user: data.user });
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StyledView className="flex-1 px-6 justify-center">
          <StyledView className="items-center mb-12">
            <StyledView className="bg-blue-500/20 p-4 rounded-full mb-6 border border-blue-500/30">
              <Zap size={48} color="#3b82f6" />
            </StyledView>
            <StyledText className="text-4xl font-bold text-white text-center mb-2">
              SmartCharge AI
            </StyledText>
            <StyledText className="text-slate-400 text-center text-lg">
              Akıllı Şarj, Daha Az Karbon.
            </StyledText>
          </StyledView>

          <StyledView className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
            <StyledText className="text-white text-xl font-semibold mb-6 flex-row items-center">
              Giriş Yap
            </StyledText>
            
            <Input
              label="E-posta Adresi"
              placeholder="driver@test.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Button
              title="Giriş Yap"
              onPress={handleLogin}
              loading={loading}
              className="mt-4"
            />

            <StyledText className="text-slate-500 text-xs text-center mt-6">
              Demo Sürümü v1.0.0
            </StyledText>
          </StyledView>
        </StyledView>
      </SafeAreaView>
    </LinearGradient>
  );
}
