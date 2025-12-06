import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { ArrowLeft, Calendar, Clock, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledSafeAreaView = styled(SafeAreaView);

// Mock Data
const HISTORY_DATA = [
  {
    id: '1',
    stationName: 'Zorlu Center AVM',
    date: '01.12.2025',
    time: '14:30',
    duration: '45 dk',
    amount: '180.50',
    kwh: '24.5',
    status: 'COMPLETED'
  },
  {
    id: '2',
    stationName: 'Kanyon AVM',
    date: '28.11.2025',
    time: '09:15',
    duration: '30 dk',
    amount: '120.00',
    kwh: '15.2',
    status: 'COMPLETED'
  },
  {
    id: '3',
    stationName: 'Akasya AVM',
    date: '25.11.2025',
    time: '18:45',
    duration: '60 dk',
    amount: '240.00',
    kwh: '32.0',
    status: 'COMPLETED'
  }
];

export default function ChargingHistoryScreen({ navigation }: any) {
  const renderItem = ({ item }: any) => (
    <StyledView className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4">
      <StyledView className="flex-row justify-between items-start mb-3">
        <StyledView>
          <StyledText className="text-white font-bold text-lg">{item.stationName}</StyledText>
          <StyledView className="flex-row items-center mt-1">
            <Calendar size={14} color="#94a3b8" />
            <StyledText className="text-slate-400 text-xs ml-1">{item.date} • {item.time}</StyledText>
          </StyledView>
        </StyledView>
        <StyledView className="bg-green-500/20 px-2 py-1 rounded">
          <StyledText className="text-green-400 text-xs font-bold">Tamamlandı</StyledText>
        </StyledView>
      </StyledView>

      <StyledView className="flex-row justify-between items-center border-t border-slate-700 pt-3">
        <StyledView className="flex-row items-center gap-4">
          <StyledView className="flex-row items-center">
            <Clock size={16} color="#3b82f6" />
            <StyledText className="text-slate-300 ml-1">{item.duration}</StyledText>
          </StyledView>
          <StyledView className="flex-row items-center">
            <Zap size={16} color="#eab308" />
            <StyledText className="text-slate-300 ml-1">{item.kwh} kWh</StyledText>
          </StyledView>
        </StyledView>
        <StyledText className="text-white font-bold text-lg">₺{item.amount}</StyledText>
      </StyledView>
    </StyledView>
  );

  return (
    <StyledView className="flex-1 bg-slate-900">
      <StyledSafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <StyledView className="px-4 py-4 flex-row items-center border-b border-slate-800 mb-4">
          <StyledTouchableOpacity 
            onPress={() => navigation.goBack()}
            className="bg-slate-800 p-2 rounded-full border border-slate-700 mr-4"
          >
            <ArrowLeft size={24} color="white" />
          </StyledTouchableOpacity>
          <StyledText className="text-white text-xl font-bold">Şarj Geçmişi</StyledText>
        </StyledView>

        <FlatList
          data={HISTORY_DATA}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
        />
      </StyledSafeAreaView>
    </StyledView>
  );
}
