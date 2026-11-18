import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';

interface ContactItemProps {
  item: UserProfile;
  onPress: () => void;
}

export const ContactItem: React.FC<ContactItemProps> = React.memo(({
  item,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={onPress}
      activeOpacity={0.7}>
      <UserAvatar
        uri={item.avatar}
        size={48}
        isOnline={item.isOnline}
        showOnlineBadge={true}
        style={styles.avatarContainer}
      />
      <View style={styles.contactInfo}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.status} numberOfLines={1}>
          {item.isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  avatarContainer: {
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
