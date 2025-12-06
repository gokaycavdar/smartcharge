import { TextInput, View, Text } from 'react-native';
import { styled } from 'nativewind';

const StyledTextInput = styled(TextInput);
const StyledView = styled(View);
const StyledText = styled(Text);

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
}

export default function Input({ value, onChangeText, placeholder, label, secureTextEntry, keyboardType }: InputProps) {
  return (
    <StyledView className="mb-4">
      {label && <StyledText className="text-slate-400 text-sm font-medium mb-2">{label}</StyledText>}
      <StyledTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-base focus:border-blue-500"
      />
    </StyledView>
  );
}
