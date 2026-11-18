import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import { ConversationItem as ConversationItemType } from '../types';
import { UserAvatar } from './UserAvatar';
import { formatConversationTime } from '../utils';

interface ConversationItemProps {
  item: ConversationItemType;
  onPress: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = React.memo(({
  item,
  onPress,
}) => {
  const hasUnread = item.unreadCount > 0;
  const isGroup = item.type === 'group';

  // Định dạng nội dung tin nhắn cuối cùng hiển thị
  let displayLastMessage = item.lastMessage || '';
  if (displayLastMessage === '📍 Vị trí đã chia sẻ') {
    displayLastMessage = '📍 Vị trí';
  }

  const avatarUri =
    item.avatar ||
    item.recipientAvatar ||
    (isGroup
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Nhóm')}&background=random`
      : `https://i.pravatar.cc/150?u=${item.recipientId}`);

  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={onPress}
      activeOpacity={0.7}>
      <UserAvatar
        uri={avatarUri}
        size={52}
        isOnline={!isGroup && item.recipientOnline}
        showOnlineBadge={!isGroup}
        style={styles.avatarContainer}
      />
      <View style={styles.conversationInfo}>
        <View style={styles.topRow}>
          <View style={styles.nameContainer}>
            {isGroup && <Text style={styles.groupBadge}>[Nhóm] </Text>}
            <Text
              style={[styles.name, hasUnread && styles.nameBold]}
              numberOfLines={1}>
              {item.name || item.recipientName || 'Hội thoại'}
            </Text>
          </View>
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>
            {formatConversationTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.lastMessage,
              hasUnread && styles.lastMessageUnread,
              displayLastMessage === 'Tin nhắn đã được thu hồi' && styles.recalledMessage,
            ]}
            numberOfLines={1}>
            {displayLastMessage}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  avatarContainer: {
    marginRight: 14,
  },
  conversationInfo: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  groupBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  name: {
    fontSize: 16,
    color: COLORS.textPrimary,
    flex: 1,
  },
  nameBold: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timeUnread: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  recalledMessage: {
    fontStyle: 'italic',
    color: COLORS.gray500,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
