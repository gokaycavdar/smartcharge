import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StoreScreen from "../screens/StoreScreen";
import CouponCenterScreen from "../screens/CouponCenterScreen";
import StationsScreen from "../screens/StationsScreen";
import ReservationsScreen from "../screens/ReservationsScreen";
import WalletScreen from "../screens/wallet/WalletScreen";
import { theme } from "../theme";
import StationsStack from "./StationsStack";

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name === "Stations" ? false : true, // ✅ sadece Harita'da header kapalı
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          height: 62,
          paddingBottom: Platform.OS === "ios" ? 10 : 8,
          paddingTop: 8,
          borderRadius: 18,
          backgroundColor: "rgba(17,24,39,0.90)",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          // shadow
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const s = focused ? size + 2 : size;
          if (route.name === "Stations") return <Ionicons name="map" size={s} color={color} />;
          if (route.name === "Reservations") return <Ionicons name="calendar" size={s} color={color} />;
          if (route.name === "Wallet") return <Ionicons name="wallet" size={s} color={color} />;
          if (route.name === "Store") return <Ionicons name="storefront" size={s} color={color} />;
          if (route.name === "Coupons") return <Ionicons name="gift" size={s} color={color} />;
          return <Ionicons name="ellipse" size={s} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Stations" component={StationsStack} options={{ headerShown: false, title: "Harita" }} />
      <Tab.Screen name="Reservations" component={ReservationsScreen} options={{ headerShown: false, title: "Randevular" }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ headerShown: false, title: "Cüzdanım" }} />
      <Tab.Screen
        name="Store"
        component={StoreScreen}
        options={{ headerShown: false, title: "Mağaza" }}
      />

      <Tab.Screen
        name="Coupons"
        component={CouponCenterScreen}
        options={{ headerShown: false, title: "Kupon" }}
      />
    </Tab.Navigator>
  );
}