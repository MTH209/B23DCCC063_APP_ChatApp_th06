import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { listenUnreadNotificationCount } from '../services/notificationService';
import { listenConversations } from '../services/chatService';

const Tab = createBottomTabNavigator();

const TabIcon = ({ icon }: { icon: string }) => (
  <Text style={styles.tabIconText}>{icon}</Text>
);

const renderHomeIcon = () => <TabIcon icon="💬" />;
const renderContactsIcon = () => <TabIcon icon="👥" />;
const renderNotificationsIcon = () => <TabIcon icon="🔔" />;
const renderSettingsIcon = () => <TabIcon icon="⚙️" />;

export const MainTabNavigator = () => {
  const { user } = useAuth();
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  // 1. Lắng nghe số thông báo chưa đọc để hiển thị Badge ở Tab Thông báo
  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenUnreadNotificationCount(user.uid, count => {
      setUnreadNotifCount(count);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // 2. Lắng nghe số tin nhắn chưa đọc để hiển thị Badge ở Tab Tin nhắn
  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenConversations(user.uid, convList => {
      const totalUnread = convList.reduce(
        (sum, item) => sum + (item.unreadCount || 0),
        0,
      );
      setUnreadMsgCount(totalUnread);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray500,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBadgeStyle: styles.badgeStyle,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Tin nhắn',
          tabBarIcon: renderHomeIcon,
          tabBarBadge: unreadMsgCount > 0 ? unreadMsgCount : undefined,
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarLabel: 'Danh bạ',
          tabBarIcon: renderContactsIcon,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Thông báo',
          tabBarIcon: renderNotificationsIcon,
          tabBarBadge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Cài đặt',
          tabBarIcon: renderSettingsIcon,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconText: {
    fontSize: 22,
  },
  tabBar: {
    height: 68,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeStyle: {
    backgroundColor: COLORS.error,
    fontSize: 10,
    fontWeight: '700',
  },
});
