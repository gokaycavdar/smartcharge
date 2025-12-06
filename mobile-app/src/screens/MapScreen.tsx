import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Dimensions, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { styled } from 'nativewind';
import { ArrowLeft, Navigation, Locate, Zap, X } from 'lucide-react-native';
import { API_URL } from '../config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface Station {
  id: number;
  name: string;
  lat: number;
  lng: number;
  price: number;
  mockStatus: 'GREEN' | 'YELLOW' | 'RED';
  mockLoad: number;
  ownerName: string;
}

export default function MapScreen({ navigation, route }: any) {
  const { userId } = route.params || {};
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      
      if (mapRef.current && location) {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 1000);
      }
    })();

    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stations`);
      const data = await response.json();
      setStations(data);
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const centerMapOnUser = async () => {
    let location = await Location.getCurrentPositionAsync({});
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  const getPinColor = (status: string) => {
    switch (status) {
      case 'GREEN': return '#22c55e';
      case 'YELLOW': return '#eab308';
      case 'RED': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  if (Platform.OS === 'web') {
    return (
      <StyledView className="flex-1 bg-slate-900 justify-center items-center p-6">
        <StyledView className="absolute top-12 left-4 z-10">
          <StyledTouchableOpacity 
            onPress={() => navigation.goBack()}
            className="bg-slate-800/90 p-3 rounded-full border border-slate-700"
          >
            <ArrowLeft size={24} color="white" />
          </StyledTouchableOpacity>
        </StyledView>
        <StyledText className="text-white text-xl font-bold text-center mb-4">Harita Web'de Desteklenmiyor</StyledText>
        <StyledText className="text-slate-400 text-center">Lütfen Android Emulator veya gerçek cihaz kullanın.</StyledText>
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1 bg-slate-900">
      {/* Header */}
      <StyledView className="absolute top-12 left-4 z-10 flex-row items-center gap-4">
        <StyledTouchableOpacity 
          onPress={() => navigation.goBack()}
          className="bg-slate-800/90 p-3 rounded-full border border-slate-700"
        >
          <ArrowLeft size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      {/* My Location Button */}
      <StyledView className="absolute bottom-8 right-4 z-10">
        <StyledTouchableOpacity 
          onPress={centerMapOnUser}
          className="bg-blue-600 p-4 rounded-full shadow-lg"
        >
          <Locate size={24} color="white" />
        </StyledTouchableOpacity>
      </StyledView>

      {loading ? (
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </StyledView>
      ) : (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          initialRegion={{
            latitude: 38.4237, // Izmir
            longitude: 27.1428, // Izmir
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          onPress={() => setSelectedStation(null)}
        >
          {stations.map((station) => (
            <Marker
              key={station.id}
              coordinate={{ latitude: station.lat, longitude: station.lng }}
              pinColor={getPinColor(station.mockStatus)}
              onPress={() => setSelectedStation(station)}
            />
          ))}
        </MapView>
      )}

      {/* Station Detail Card (Bottom Sheet) */}
      {selectedStation && (
        <StyledView className="absolute bottom-0 left-0 right-0 bg-slate-800 p-6 rounded-t-3xl border-t border-slate-700 shadow-2xl z-20">
            <StyledView className="flex-row justify-between items-start mb-4">
                <StyledView>
                    <StyledText className="text-white font-bold text-xl">{selectedStation.name}</StyledText>
                    <StyledText className="text-slate-400 text-sm">{selectedStation.ownerName}</StyledText>
                </StyledView>
                <StyledTouchableOpacity 
                    onPress={() => setSelectedStation(null)}
                    className="bg-slate-700 p-2 rounded-full"
                >
                    <X size={20} color="#94a3b8" />
                </StyledTouchableOpacity>
            </StyledView>

            <StyledView className="flex-row gap-4 mb-6">
                <StyledView className="flex-1 bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                    <StyledText className="text-slate-400 text-xs mb-1">Birim Fiyat</StyledText>
                    <StyledText className="text-blue-400 font-bold text-lg">₺{selectedStation.price}/kWh</StyledText>
                </StyledView>
                <StyledView className={`flex-1 p-3 rounded-xl border ${
                      selectedStation.mockStatus === 'GREEN' ? 'bg-green-500/10 border-green-500/30' : 
                      selectedStation.mockStatus === 'YELLOW' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'
                    }`}>
                    <StyledText className="text-slate-400 text-xs mb-1">Doluluk</StyledText>
                    <StyledText className={`font-bold text-lg ${
                        selectedStation.mockStatus === 'GREEN' ? 'text-green-400' : 
                        selectedStation.mockStatus === 'YELLOW' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        %{selectedStation.mockLoad}
                    </StyledText>
                </StyledView>
            </StyledView>

            <StyledTouchableOpacity 
                onPress={() => navigation.navigate('StationDetail', { station: selectedStation, userId })}
                className="bg-blue-600 py-4 rounded-xl items-center flex-row justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
                <Zap size={20} color="white" />
                <StyledText className="text-white font-bold text-base">Randevu Al</StyledText>
            </StyledTouchableOpacity>
        </StyledView>
      )}
    </StyledView>
  );
}
