import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth:token";
const USER_ID_KEY = "auth:userId";

// TOKEN
export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

// USER ID
export async function setStoredUserId(id: string) {
  await AsyncStorage.setItem(USER_ID_KEY, id);
}

export async function getStoredUserId() {
  return await AsyncStorage.getItem(USER_ID_KEY);
}

// CLEAR
export async function clearAuth() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_ID_KEY]);
}