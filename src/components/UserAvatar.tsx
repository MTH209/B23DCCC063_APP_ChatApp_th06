import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '../theme';

interface UserAvatarProps {
  uri?: string;
  size?: number;
  isOnline?: boolean;
  showOnlineBadge?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const UserAvatar: React.FC<UserAvatarProps> = React.memo(({
  uri,
  size = 48,
  isOnline = false,
  showOnlineBadge = false,
  style,
}) => {
  const avatarUri = uri || 'https://i.pravatar.cc/150';
  const dotSize = Math.max(10, Math.round(size * 0.28));
  const dotBorderRadius = dotSize / 2;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={{ uri: avatarUri }}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
      {showOnlineBadge && isOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotBorderRadius,
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: COLORS.gray200,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});
