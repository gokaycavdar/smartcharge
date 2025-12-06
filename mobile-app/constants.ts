import { Platform } from 'react-native';

// Android Emulator için 10.0.2.2, iOS Simulator için localhost
// Gerçek cihaz için bilgisayarınızın IP adresini buraya yazın (örn: 192.168.1.X)
const LOCALHOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = `http://${LOCALHOST}:3000`;

export const THEME = {
  colors: {
    background: '#0f172a', // slate-900
    card: '#1e293b',       // slate-800
    cardBorder: '#334155', // slate-700
    primary: '#2563eb',    // blue-600
    primaryHover: '#1d4ed8', // blue-700
    secondary: '#64748b',  // slate-500
    text: '#f1f5f9',       // slate-100
    textSecondary: '#94a3b8', // slate-400
    success: '#10b981',    // green-500
    danger: '#ef4444',     // red-500
    warning: '#f59e0b',    // amber-500
  }
};
