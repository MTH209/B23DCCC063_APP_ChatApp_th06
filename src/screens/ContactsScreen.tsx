import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../theme';
import { UserProfile } from '../types';
import { listenAllUsers } from '../services/userService';
import { useAuth } from '../context';
import { ContactItem } from '../components/ContactItem';

const ContactsScreen = ({ navigation }: { navigation: any }) => {
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }

    // Lắng nghe người dùng từ Firebase (loại trừ bản thân)
    const unsubscribe = listenAllUsers(user.uid, userList => {
      setUsers(userList);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchText.toLowerCase()),
  );

  const onlineUsers = filteredUsers.filter(u => u.isOnline);
  const offlineUsers = filteredUsers.filter(u => !u.isOnline);

  const renderContact = useCallback(
    (item: UserProfile) => (
      <ContactItem
        key={item.uid}
        item={item}
        onPress={() =>
          navigation.navigate('Chat', {
            recipientId: item.uid,
            recipientName: item.name,
            recipientAvatar: item.avatar,
          })
        }
      />
    ),
    [navigation],
  );

  const sections: { title: string; data: UserProfile[] }[] = [];
  if (onlineUsers.length > 0) {
    sections.push({ title: 'Đang trực tuyến', data: onlineUsers });
  }
  if (offlineUsers.length > 0) {
    sections.push({ title: 'Ngoại tuyến', data: offlineUsers });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh bạ</Text>
        <TouchableOpacity
          style={styles.createGroupBtn}
          onPress={() => navigation.navigate('CreateGroup')}
          accessibilityLabel="Tạo nhóm mới">
          <Text style={styles.createGroupText}>➕ Tạo nhóm</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm danh bạ..."
          placeholderTextColor={COLORS.gray500}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      <FlatList
        data={sections}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item: section }) => (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {section.title} ({section.data.length})
            </Text>
            {section.data.map(contact => renderContact(contact))}
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchText
                ? 'Không tìm thấy người dùng phù hợp'
                : 'Chưa có người dùng nào khác trong hệ thống'}
            </Text>
          </View>
        }
      />
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
  createGroupBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  createGroupText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray500,
    fontSize: 14,
  },
});

export default ContactsScreen;
