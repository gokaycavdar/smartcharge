import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootStack from "./src/navigation/RootStack";
import ChatFab from "./src/components/ChatFab";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { navigationRef } from "./src/navigation/navigationRef";

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootStack />
        <ChatFab />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}