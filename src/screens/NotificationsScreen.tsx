import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../theme';
import { Notification as NotificationType } from '../types';
import {
  listenNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import { useAuth } from '../context';
import { formatConversationTime } from '../utils';

const NotificationsScreen = ({ navigation }: { navigation: any }) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const currentUid = user?.uid || '';

  useEffect(() => {
    if (!currentUid) {
      setLoading(false);
      return;
    }

    // Lắng nghe dữ liệu thông báo thật từ Firebase Realtime Database
    const unsubscribe = listenNotifications(currentUid, list => {
      setNotifications(list);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUid]);

  const handleNotificationPress = async (item: NotificationType) => {
    // 1. Đánh dấu đã đọc
    if (!item.read && !item.isRead) {
      await markNotificationAsRead(currentUid, item.id);
    }

    // 2. Mở đúng cuộc trò chuyện liên quan
    if (item.convId) {
      navigation.navigate('Chat', {
        convId: item.convId,
        chatId: item.convId,
        recipientName: item.fromName,
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUid) return;
    await markAllNotificationsAsRead(currentUid);
  };

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'group_added':
        return '👥';
      case 'reaction':
        return '❤️';
      case 'message':
        return '💬';
      default:
        return '🔔';
    }
  };

  const renderNotification = ({ item }: { item: NotificationType }) => {
    const isUnread = !item.read && !item.isRead;
    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}>
        <View style={styles.notificationIcon}>
          <View
            style={[
              styles.iconCircle,
              isUnread && styles.iconCircleUnread,
            ]}>
            <Text style={styles.iconEmoji}>
              {getNotificationIcon(item.type)}
            </Text>
          </View>
        </View>
        <View style={styles.notificationContent}>
          <Text
            style={[
              styles.notificationText,
              isUnread && styles.unreadText,
            ]}>
            {item.text || item.content}
          </Text>
          <Text style={styles.notificationTime}>
            {formatConversationTime(item.createdAt)}
          </Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Đánh dấu tất cả đã đọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Banner thông báo chưa đọc */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            Bạn có {unreadCount} thông báo chưa đọc
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
          <Text style={styles.emptySubtitle}>
            Bạn sẽ nhận được thông báo khi có tin nhắn mới, được thêm vào nhóm hoặc có người thả cảm xúc!
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  markAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  unreadBanner: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  unreadBannerText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: COLORS.white,
  },
  unreadItem: {
    backgroundColor: '#F0F7FF',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notificationIcon: {
    marginRight: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleUnread: {
    backgroundColor: COLORS.primaryLight,
  },
  iconEmoji: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;
