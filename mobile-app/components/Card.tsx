import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { THEME } from '../constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, title }) => {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    marginBottom: 16,
  },
  title: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
});
