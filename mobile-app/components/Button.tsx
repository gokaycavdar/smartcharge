import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { THEME } from '../constants';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onPress, 
  title, 
  variant = 'primary', 
  loading = false,
  style,
  disabled
}) => {
  const getBackgroundColor = () => {
    if (disabled) return THEME.colors.cardBorder;
    switch (variant) {
      case 'secondary': return THEME.colors.cardBorder;
      case 'danger': return THEME.colors.danger;
      default: return THEME.colors.primary;
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: getBackgroundColor() }, style]} 
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
