import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import DriverHomeScreen from './src/screens/DriverHomeScreen';
import MapScreen from './src/screens/MapScreen';
import ChargingHistoryScreen from './src/screens/ChargingHistoryScreen';
import StationDetailScreen from './src/screens/StationDetailScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0f172a' }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="ChargingHistory" component={ChargingHistoryScreen} />
        <Stack.Screen name="StationDetail" component={StationDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
