import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../theme';
import { UserAvatar } from '../UserAvatar';
import { formatLastSeen } from '../../utils';

interface ChatHeaderProps {
  name: string;
  avatar: string;
  isOnline: boolean;
  isGroup?: boolean;
  onlineCount?: number;
  totalMembersCount?: number;
  isTyping?: boolean;
  typingText?: string;
  lastSeen?: number;
  onBack: () => void;
  onHeaderPress?: () => void;
  onSearchPress?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({
  name,
  avatar,
  isOnline,
  isGroup = false,
  onlineCount = 0,
  totalMembersCount = 0,
  isTyping = false,
  typingText = 'đang soạn tin...',
  lastSeen,
  onBack,
  onHeaderPress,
  onSearchPress,
}) => {
  // Xác định dòng trạng thái hiển thị
  let statusText = '';
  if (isTyping) {
    statusText = typingText;
  } else if (isGroup) {
    statusText = `${totalMembersCount} thành viên (${onlineCount} trực tuyến)`;
  } else if (isOnline) {
    statusText = 'Đang hoạt động';
  } else {
    statusText = formatLastSeen(lastSeen);
  }

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessibilityLabel="Quay lại">
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.headerInfoTouchable}
        onPress={onHeaderPress}
        disabled={!onHeaderPress}
        activeOpacity={0.7}>
        <UserAvatar
          uri={avatar}
          size={42}
          isOnline={!isGroup && isOnline}
          showOnlineBadge={!isGroup}
          style={styles.avatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.statusRow}>
            {/* Chấm tròn online hoặc biểu tượng bút chì đang soạn */}
            {isTyping ? (
              <Text style={styles.typingIcon}>✍️</Text>
            ) : !isGroup ? (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? COLORS.online : COLORS.offline },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: onlineCount > 0 ? COLORS.online : COLORS.offline },
                ]}
              />
            )}
            <Text
              style={[
                styles.headerStatus,
                isTyping && styles.typingStatusText,
                !isGroup && isOnline && styles.onlineStatusText,
              ]}
              numberOfLines={1}>
              {statusText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Nút tìm kiếm tin nhắn trong phòng chat */}
      {onSearchPress && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onSearchPress}
          accessibilityLabel="Tìm kiếm trong cuộc trò chuyện">
          <Text style={styles.actionIcon}>🔍</Text>
        </TouchableOpacity>
      )}

      {/* Nút thông tin nhóm nếu là Group */}
      {isGroup && onHeaderPress && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onHeaderPress}
          accessibilityLabel="Thông tin nhóm">
          <Text style={styles.actionIcon}>ℹ️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.background,
  },
  backButton: {
    marginRight: 6,
    padding: 6,
  },
  backText: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerInfoTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  typingIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  onlineStatusText: {
    color: COLORS.online,
    fontWeight: '500',
  },
  typingStatusText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  actionBtn: {
    padding: 8,
    marginLeft: 4,
  },
  actionIcon: {
    fontSize: 19,
  },
});
