import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BatteryCharging, Leaf, Zap, Megaphone, CheckCircle } from 'lucide-react-native';
import { API_URL } from '../config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledScrollView = styled(ScrollView);

interface Slot {
  hour: number;
  label: string;
  startTime: string;
  isGreen: boolean;
  coins: number;
  price: number;
  status: string;
  load: number;
  campaignApplied?: {
    title: string;
    discount: string;
  } | null;
}

export default function StationDetailScreen({ route, navigation }: any) {
  const { station, userId } = route.params;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stations/${station.id}`);
      const data = await response.json();
      if (data.slots) {
        setSlots(data.slots);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      Alert.alert('Hata', 'Saatler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (slot: Slot) => {
    if (!userId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }

    setBooking(true);
    try {
      const response = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          stationId: station.id,
          date: slot.startTime,
          hour: slot.label,
          isGreen: slot.isGreen,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Rezervasyon Başarılı!',
          `+${slot.coins} Coin kazandın! ${slot.isGreen ? 'Eco Slot avantajıyla.' : ''}`,
          [{ text: 'Tamam', onPress: () => navigation.navigate('DriverHome') }]
        );
      } else {
        throw new Error(result.error || 'Rezervasyon başarısız');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      Alert.alert('Hata', 'Rezervasyon oluşturulamadı.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <StyledView className="flex-1 bg-slate-900">
      <StyledSafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <StyledView className="px-4 py-4 flex-row items-center border-b border-slate-800 bg-slate-900 z-10">
          <StyledTouchableOpacity 
            onPress={() => navigation.goBack()}
            className="bg-slate-800 p-2 rounded-full border border-slate-700 mr-4"
          >
            <ArrowLeft size={24} color="white" />
          </StyledTouchableOpacity>
          <StyledView className="flex-1">
            <StyledText className="text-blue-400 text-xs font-bold uppercase tracking-widest">Smart Slot Finder</StyledText>
            <StyledText className="text-white text-xl font-bold" numberOfLines={1}>{station.name}</StyledText>
          </StyledView>
        </StyledView>

        <StyledScrollView className="flex-1 p-4">
          {/* Info Card */}
          <StyledView className="bg-slate-800 p-4 rounded-2xl border border-slate-700 mb-6">
            <StyledView className="flex-row items-center gap-2 mb-2">
              <Zap size={20} color="#fbbf24" />
              <StyledText className="text-white font-bold text-lg">İstasyon Detayları</StyledText>
            </StyledView>
            <StyledText className="text-slate-400 text-sm mb-4">
              Yoğunluğu düşük (yeşil) saatleri seçerek daha fazla coin kazanabilir ve %20 indirim alabilirsin.
            </StyledText>
            
            <StyledView className="flex-row gap-4">
              <StyledView className="flex-1 bg-slate-700/50 p-3 rounded-xl">
                <StyledText className="text-slate-400 text-xs">Birim Fiyat</StyledText>
                <StyledText className="text-white font-bold text-lg">₺{station.price}/kWh</StyledText>
              </StyledView>
              <StyledView className="flex-1 bg-slate-700/50 p-3 rounded-xl">
                <StyledText className="text-slate-400 text-xs">Mevcut Yük</StyledText>
                <StyledText className={`font-bold text-lg ${
                  station.mockStatus === 'GREEN' ? 'text-green-400' : 
                  station.mockStatus === 'YELLOW' ? 'text-yellow-400' : 'text-red-400'
                }`}>%{station.mockLoad}</StyledText>
              </StyledView>
            </StyledView>
          </StyledView>

          {/* Slots Grid */}
          <StyledText className="text-white font-bold text-lg mb-4">Uygun Saatler</StyledText>
          
          {loading ? (
            <StyledView className="py-12 items-center">
              <ActivityIndicator size="large" color="#3b82f6" />
              <StyledText className="text-slate-400 mt-4">Saatler yükleniyor...</StyledText>
            </StyledView>
          ) : (
            <StyledView className="flex-row flex-wrap justify-between">
              {slots.map((slot) => (
                <StyledTouchableOpacity
                  key={slot.hour}
                  disabled={booking}
                  onPress={() => handleBooking(slot)}
                  className={`w-[48%] p-3 rounded-xl border mb-3 ${
                    slot.isGreen 
                      ? 'bg-green-500/10 border-green-500/50' 
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  {slot.isGreen && (
                    <StyledView className="absolute -top-2 -right-2 bg-green-500 px-2 py-0.5 rounded-full z-10">
                      <StyledText className="text-black text-[10px] font-bold">ECO</StyledText>
                    </StyledView>
                  )}
                  
                  {slot.campaignApplied && (
                    <StyledView className="absolute -top-2 -left-2 bg-purple-500 px-2 py-0.5 rounded-full z-10">
                      <StyledText className="text-white text-[10px] font-bold">{slot.campaignApplied.discount}</StyledText>
                    </StyledView>
                  )}

                  <StyledView className="flex-row justify-between items-center mb-2">
                    <StyledText className="text-white font-bold text-lg">{slot.label}</StyledText>
                    <StyledView className="flex-row items-center gap-1">
                      <StyledView className={`w-2 h-2 rounded-full ${slot.isGreen ? 'bg-green-400' : 'bg-slate-400'}`} />
                      <StyledText className="text-slate-400 text-xs">%{slot.load}</StyledText>
                    </StyledView>
                  </StyledView>

                  <StyledView className="flex-row justify-between items-center">
                    <StyledText className="text-slate-300 font-medium">₺{slot.price.toFixed(2)}</StyledText>
                    <StyledView className="flex-row items-center gap-1">
                      <BatteryCharging size={12} color={slot.isGreen ? '#fde047' : '#94a3b8'} />
                      <StyledText className={`text-xs font-bold ${slot.isGreen ? 'text-yellow-300' : 'text-slate-400'}`}>
                        +{slot.coins}
                      </StyledText>
                    </StyledView>
                  </StyledView>

                  {slot.campaignApplied ? (
                    <StyledView className="mt-2 flex-row items-center gap-1">
                      <Megaphone size={10} color="#c084fc" />
                      <StyledText className="text-purple-400 text-[10px] font-bold" numberOfLines={1}>
                        {slot.campaignApplied.title}
                      </StyledText>
                    </StyledView>
                  ) : slot.isGreen ? (
                    <StyledView className="mt-2 flex-row items-center gap-1">
                      <Leaf size={10} color="#4ade80" />
                      <StyledText className="text-green-400 text-[10px] font-bold">Düşük Yük</StyledText>
                    </StyledView>
                  ) : (
                    <StyledText className="mt-2 text-slate-500 text-[10px]">Standart Tarife</StyledText>
                  )}
                </StyledTouchableOpacity>
              ))}
            </StyledView>
          )}
        </StyledScrollView>
      </StyledSafeAreaView>

      {booking && (
        <StyledView className="absolute inset-0 bg-black/50 justify-center items-center z-50">
          <StyledView className="bg-slate-800 p-6 rounded-2xl items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <StyledText className="text-white mt-4 font-bold">Rezervasyon Yapılıyor...</StyledText>
          </StyledView>
        </StyledView>
      )}
    </StyledView>
  );
}
