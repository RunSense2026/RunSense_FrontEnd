import { Text, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { getInitials } from '@/utils/initials';

interface ProfileAvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
}

// Shows the user photo when set, otherwise a gradient circle with auto initials.
export const ProfileAvatar = ({ name, uri, size = 60 }: ProfileAvatarProps) => {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <LinearGradient
      colors={['#a78bfa', '#7c3aed', '#3b82f6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: Math.round(size * 0.33), fontWeight: '700', color: '#fff', letterSpacing: -0.5 }}>
        {getInitials(name)}
      </Text>
    </LinearGradient>
  );
};
