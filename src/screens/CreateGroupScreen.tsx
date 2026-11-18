import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../theme';
import { UserProfile } from '../types';
import { listenAllUsers } from '../services/userService';
import { createGroup } from '../services/groupService';
import { useAuth } from '../context';
import { UserAvatar } from '../components/UserAvatar';

const CreateGroupScreen = ({ navigation }: { navigation: any }) => {
  const [groupName, setGroupName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const currentUid = user?.uid || '';
  const currentUserName = user?.displayName || 'Người dùng';

  useEffect(() => {
    if (!currentUid) return;

    // Lắng nghe danh sách bạn bè trong danh bạ (loại trừ bản thân)
    const unsubscribe = listenAllUsers(currentUid, userList => {
      setUsers(userList);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUid]);

  const toggleSelectUser = (uid: string) => {
    setSelectedUids(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid],
    );
  };

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert('Chưa nhập tên nhóm', 'Vui lòng đặt tên cho nhóm trò chuyện!');
      return;
    }

    if (selectedUids.length < 2) {
      Alert.alert(
        'Chưa đủ thành viên',
        'Vui lòng chọn tối thiểu 2 người bạn từ Danh bạ để tạo nhóm!',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const allMembers = [currentUid, ...selectedUids];
      const convId = await createGroup(
        trimmedName,
        allMembers,
        currentUid,
        currentUserName,
      );

      // Chuyển hướng ngay tới phòng chat nhóm vừa tạo
      navigation.replace('Chat', {
        convId,
        chatId: convId,
        convType: 'group',
        recipientName: trimmedName,
        recipientAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=random`,
      });
    } catch (error) {
      console.warn('Lỗi tạo nhóm:', error);
      Alert.alert('Lỗi', 'Không thể tạo nhóm lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(searchText.toLowerCase()),
  );

  const isReady = groupName.trim().length > 0 && selectedUids.length >= 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo nhóm mới</Text>
        <TouchableOpacity
          style={[styles.createButton, !isReady && styles.createButtonDisabled]}
          onPress={handleCreateGroup}
          disabled={!isReady || isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.createText}>Tạo ({selectedUids.length})</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Ô nhập tên nhóm */}
      <View style={styles.groupNameContainer}>
        <View style={styles.groupIconBox}>
          <Text style={styles.groupIconText}>👥</Text>
        </View>
        <TextInput
          style={styles.groupNameInput}
          placeholder="Nhập tên nhóm trò chuyện..."
          placeholderTextColor={COLORS.gray500}
          value={groupName}
          onChangeText={setGroupName}
          maxLength={50}
        />
      </View>

      {/* Thông tin số lượng thành viên đã chọn */}
      <View style={styles.requirementBox}>
        <Text style={styles.requirementText}>
          Thành viên đã chọn:{' '}
          <Text
            style={[
              styles.requirementHighlight,
              selectedUids.length >= 2 && styles.requirementValid,
            ]}>
            {selectedUids.length}/2
          </Text>{' '}
          (tối thiểu 2 người ngoài bạn)
        </Text>
      </View>

      {/* Ô tìm kiếm danh bạ */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm bạn bè theo tên..."
          placeholderTextColor={COLORS.gray500}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Danh sách bạn bè chọn thành viên */}
      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.uid}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected = selectedUids.includes(item.uid);
          return (
            <TouchableOpacity
              style={[
                styles.userItem,
                isSelected && styles.userItemSelected,
              ]}
              onPress={() => toggleSelectUser(item.uid)}
              activeOpacity={0.7}>
              <UserAvatar
                uri={item.avatar}
                size={46}
                isOnline={item.isOnline}
                showOnlineBadge={true}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userStatus}>
                  {item.isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchText
                ? 'Không tìm thấy bạn bè nào'
                : 'Chưa có bạn bè trong danh bạ'}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  backButton: {
    padding: 6,
  },
  backText: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.gray400,
  },
  createText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  groupIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupIconText: {
    fontSize: 24,
  },
  groupNameInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  requirementBox: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  requirementText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  requirementHighlight: {
    fontWeight: '700',
    color: COLORS.error,
  },
  requirementValid: {
    color: COLORS.online,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
  },
  searchInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  userItemSelected: {
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
});

export default CreateGroupScreen;
