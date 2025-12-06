import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, MapPin, BatteryCharging, Bell, User, Zap, Leaf, Award, Coins, Sparkles, ChevronRight, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledScrollView = styled(ScrollView);
const StyledImage = styled(Image);

interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface Reservation {
  id: number;
  date: string;
  hour: string;
  isGreen: boolean;
  earnedCoins: number;
  status: string;
  station: {
    id: number;
    name: string;
    price: number;
  };
}

interface UserData {
  id: number;
  name: string;
  email: string;
  coins: number;
  co2Saved: number;
  xp: number;
  badges: Badge[];
  reservations: Reservation[];
}

export default function DriverHomeScreen({ route, navigation }: any) {
  const { user: initialUser } = route.params || {};
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = async () => {
    try {
      const userId = initialUser?.id || 1; // Fallback to ID 1 for demo
      const response = await fetch(`${API_URL}/api/users/${userId}`);
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  if (loading) {
    return (
      <StyledView className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1 bg-slate-900">
      <StyledSafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <StyledView className="px-6 py-4 flex-row justify-between items-center">
          <StyledView>
            <StyledText className="text-slate-400 text-xs font-bold uppercase tracking-widest">Sürücü Paneli</StyledText>
            <StyledText className="text-white text-2xl font-bold">Merhaba, {user?.name?.split(' ')[0]}</StyledText>
          </StyledView>
          <StyledTouchableOpacity 
            className="bg-slate-800 p-2 rounded-full border border-slate-700"
            onPress={() => navigation.navigate('ChargingHistory')}
          >
            <Bell size={24} color="#94a3b8" />
          </StyledTouchableOpacity>
        </StyledView>

        <StyledScrollView 
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <StyledView className="p-6 space-y-6">
            
            {/* Main Gamification Card */}
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 24 }}
            >
              <StyledView className="flex-row justify-between items-start mb-6">
                <StyledView>
                  <StyledView className="flex-row items-center gap-2 mb-1">
                    <Coins size={20} color="#fde047" />
                    <StyledText className="text-blue-100 text-sm font-bold">EcoCoin Bakiyesi</StyledText>
                  </StyledView>
                  <StyledText className="text-white text-4xl font-bold">{user?.coins?.toLocaleString() || '0'}</StyledText>
                </StyledView>
                <StyledView className="bg-white/20 p-3 rounded-2xl">
                  <Trophy size={32} color="#fde047" />
                </StyledView>
              </StyledView>
              
              <StyledView className="bg-black/20 rounded-xl p-4 flex-row items-center justify-between">
                <StyledView>
                  <StyledText className="text-blue-200 text-xs font-medium">XP Seviyesi</StyledText>
                  <StyledText className="text-white text-lg font-bold">{user?.xp} XP</StyledText>
                </StyledView>
                <StyledView className="h-8 w-[1px] bg-white/20" />
                <StyledView>
                  <StyledText className="text-blue-200 text-xs font-medium">Rozetler</StyledText>
                  <StyledText className="text-white text-lg font-bold">{user?.badges?.length || 0} Adet</StyledText>
                </StyledView>
              </StyledView>
            </LinearGradient>

            {/* Stats Grid */}
            <StyledView className="flex-row gap-4">
              <StyledView className="flex-1 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <StyledView className="bg-green-500/20 w-10 h-10 rounded-full items-center justify-center mb-3">
                  <Leaf size={20} color="#4ade80" />
                </StyledView>
                <StyledText className="text-slate-400 text-xs font-medium">CO2 Tasarrufu</StyledText>
                <StyledText className="text-white text-xl font-bold">{user?.co2Saved.toFixed(1)} kg</StyledText>
              </StyledView>

              <StyledView className="flex-1 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <StyledView className="bg-purple-500/20 w-10 h-10 rounded-full items-center justify-center mb-3">
                  <Sparkles size={20} color="#c084fc" />
                </StyledView>
                <StyledText className="text-slate-400 text-xs font-medium">Yeşil Şarj</StyledText>
                <StyledText className="text-white text-xl font-bold">
                  {user?.reservations?.filter(r => r.isGreen).length || 0} Kez
                </StyledText>
              </StyledView>
            </StyledView>

            {/* Badges Section */}
            <StyledView>
              <StyledView className="flex-row justify-between items-center mb-4">
                <StyledText className="text-white text-lg font-bold">Rozet Koleksiyonu</StyledText>
                <StyledText className="text-slate-500 text-xs">Tümünü Gör</StyledText>
              </StyledView>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {user?.badges && user.badges.length > 0 ? (
                  user.badges.map((badge) => (
                    <StyledView key={badge.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mr-3 w-32 items-center">
                      <StyledText className="text-3xl mb-2">{badge.icon}</StyledText>
                      <StyledText className="text-white font-bold text-center text-sm mb-1">{badge.name}</StyledText>
                      <StyledText className="text-slate-500 text-[10px] text-center" numberOfLines={2}>{badge.description}</StyledText>
                    </StyledView>
                  ))
                ) : (
                  <StyledView className="bg-slate-800 p-4 rounded-2xl border border-slate-700 w-full">
                    <StyledText className="text-slate-400 text-sm text-center">Henüz rozet kazanılmadı.</StyledText>
                  </StyledView>
                )}
              </ScrollView>
            </StyledView>

            {/* Recent Activity */}
            <StyledView>
              <StyledText className="text-white text-lg font-bold mb-4">Son Aktiviteler</StyledText>
              {user?.reservations && user.reservations.length > 0 ? (
                user.reservations.slice(0, 3).map((res) => (
                  <StyledView key={res.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-3 flex-row items-center justify-between">
                    <StyledView className="flex-row items-center gap-3">
                      <StyledView className={`w-10 h-10 rounded-full items-center justify-center ${res.isGreen ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                        {res.isGreen ? <Leaf size={20} color="#4ade80" /> : <Zap size={20} color="#94a3b8" />}
                      </StyledView>
                      <StyledView>
                        <StyledText className="text-white font-bold">{res.station.name}</StyledText>
                        <StyledText className="text-slate-400 text-xs">{new Date(res.date).toLocaleDateString('tr-TR')} • {res.hour}</StyledText>
                      </StyledView>
                    </StyledView>
                    <StyledView className="items-end">
                      <StyledText className={`font-bold ${res.isGreen ? 'text-yellow-400' : 'text-slate-400'}`}>
                        +{res.earnedCoins} Coin
                      </StyledText>
                      {res.isGreen && (
                        <StyledText className="text-green-500 text-[10px] font-bold">ECO SLOT</StyledText>
                      )}
                    </StyledView>
                  </StyledView>
                ))
              ) : (
                <StyledText className="text-slate-500 text-center py-4">Henüz aktivite yok.</StyledText>
              )}
            </StyledView>

          </StyledView>
        </StyledScrollView>

        {/* Floating Action Button for Map */}
        <StyledView className="absolute bottom-6 left-6 right-6">
          <StyledTouchableOpacity 
            className="bg-green-500 p-4 rounded-2xl flex-row items-center justify-center shadow-lg shadow-green-500/20"
            onPress={() => navigation.navigate('Map', { userId: user?.id })}
          >
            <MapPin size={24} color="black" className="mr-2" />
            <StyledText className="text-black font-bold text-lg ml-2">Haritada İstasyon Bul</StyledText>
          </StyledTouchableOpacity>
        </StyledView>

      </StyledSafeAreaView>
    </StyledView>
  );
}

