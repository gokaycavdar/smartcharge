import { Platform } from "react-native";

export const API_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8080/v1"
    : "http://localhost:8080/v1";