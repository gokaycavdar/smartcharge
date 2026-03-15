import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StationsScreen from "../screens/StationsScreen";
import StationDetailScreen from "../screens/StationDetailScreen";
import CreateReservationScreen from "../screens/CreateReservationScreen";
import RecommendationsScreen from "../screens/RecommendationsScreen";

const Stack = createNativeStackNavigator();

export default function StationsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StationsHome"
        component={StationsScreen}
        options={{
          title: "Akıllı Harita",
          headerStyle: { backgroundColor: "#0B1220" }, // landing dark
          headerTintColor: "white",
          headerTitleStyle: { fontWeight: "900" },
          headerShadowVisible: false,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="StationDetail"
        component={StationDetailScreen}
        options={{
          title: "İstasyon",
          headerStyle: { backgroundColor: "#0B1220" },
          headerTintColor: "white",
          headerTitleStyle: { fontWeight: "900" },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="CreateReservation"
        component={CreateReservationScreen}
        options={{
          title: "Rezervasyon",
          headerStyle: { backgroundColor: "#0B1220" },
          headerTintColor: "white",
          headerTitleStyle: { fontWeight: "900" },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
        title: "Öneriler",
        headerStyle: {
          backgroundColor: "#1B2A46", // header arka planı
        },
        headerTitleStyle: {
          color: "#0F172A", // koyu renk yazı
          fontWeight: "900",
        },
      }}
      />
    </Stack.Navigator>
  );
}