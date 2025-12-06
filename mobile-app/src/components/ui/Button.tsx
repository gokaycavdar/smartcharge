import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  className?: string;
}

export default function Button({ onPress, title, variant = 'primary', loading, className }: ButtonProps) {
  let bgClass = 'bg-blue-600';
  let textClass = 'text-white';

  if (variant === 'secondary') {
    bgClass = 'bg-slate-700';
    textClass = 'text-slate-200';
  } else if (variant === 'outline') {
    bgClass = 'bg-transparent border border-slate-600';
    textClass = 'text-slate-300';
  }

  return (
    <StyledTouchableOpacity 
      onPress={onPress} 
      className={`py-4 px-6 rounded-xl items-center justify-center ${bgClass} ${className}`}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#94a3b8' : 'white'} />
      ) : (
        <StyledText className={`font-bold text-base ${textClass}`}>
          {title}
        </StyledText>
      )}
    </StyledTouchableOpacity>
  );
}
