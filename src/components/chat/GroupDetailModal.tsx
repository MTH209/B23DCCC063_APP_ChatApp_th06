import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { COLORS } from '../../theme';
import { ConversationModel, UserProfile } from '../../types';
import { UserAvatar } from '../UserAvatar';
import {
  updateGroupName,
  addMembersToGroup,
  leaveGroup,
} from '../../services/groupService';
import { listenAllUsers } from '../../services/userService';

interface GroupDetailModalProps {
  visible: boolean;
  convId: string;
  groupInfo: ConversationModel | null;
  currentUid: string;
  currentUserName: string;
  onClose: () => void;
  onLeaveGroupSuccess: () => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  visible,
  convId,
  groupInfo,
  currentUid,
  currentUserName,
  onClose,
  onLeaveGroupSuccess,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedAddUids, setSelectedAddUids] = useState<string[]>([]);

  useEffect(() => {
    if (groupInfo) {
      setNewGroupName(groupInfo.name || '');
    }
  }, [groupInfo]);

  useEffect(() => {
    if (!currentUid || !visible) return;
    const unsub = listenAllUsers(currentUid, list => {
      setAllUsers(list);
    });
    return () => unsub();
  }, [currentUid, visible]);

  if (!groupInfo) return null;

  const memberUids = Object.keys(groupInfo.members || {});

  // Danh sách người dùng chưa ở trong nhóm
  const nonGroupUsers = allUsers.filter(u => !groupInfo.members?.[u.uid]);

  const handleSaveGroupName = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Lỗi', 'Tên nhóm không được để trống');
      return;
    }
    try {
      await updateGroupName(
        convId,
        newGroupName.trim(),
        currentUid,
        currentUserName,
        memberUids,
      );
      setIsEditingName(false);
      Alert.alert('Thành công', 'Đã đổi tên nhóm thành công!');
    } catch {
      Alert.alert('Lỗi', 'Không thể đổi tên nhóm. Vui lòng thử lại.');
    }
  };

  const handleAddMembers = async () => {
    if (selectedAddUids.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 thành viên để thêm.');
      return;
    }
    try {
      await addMembersToGroup(
        convId,
        groupInfo.name || 'Nhóm',
        selectedAddUids,
        currentUid,
        currentUserName,
        memberUids,
      );
      setSelectedAddUids([]);
      setIsAddingMember(false);
      Alert.alert('Thành công', 'Đã thêm thành viên vào nhóm!');
    } catch {
      Alert.alert('Lỗi', 'Không thể thêm thành viên lúc này.');
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Rời nhóm',
      'Bạn có chắc chắn muốn rời khỏi nhóm này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(convId, currentUid, currentUserName, memberUids);
              onClose();
              onLeaveGroupSuccess();
            } catch {
              Alert.alert('Lỗi', 'Không thể rời nhóm lúc này.');
            }
          },
        },
      ],
    );
  };

  const toggleSelectAddUser = (uid: string) => {
    setSelectedAddUids(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông tin nhóm</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Thông tin nhóm */}
        <View style={styles.groupInfoCard}>
          <UserAvatar
            uri={groupInfo.avatar || ''}
            size={70}
            style={styles.groupAvatar}
          />

          {isEditingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.nameInput}
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
              />
              <TouchableOpacity
                style={styles.saveNameBtn}
                onPress={handleSaveGroupName}>
                <Text style={styles.saveNameText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelNameBtn}
                onPress={() => setIsEditingName(false)}>
                <Text style={styles.cancelNameText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.groupName}>{groupInfo.name}</Text>
              <TouchableOpacity
                onPress={() => setIsEditingName(true)}
                style={styles.editIconBtn}>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.memberCountText}>
            {memberUids.length} thành viên
          </Text>
        </View>

        {/* Nút thêm thành viên */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Danh sách thành viên</Text>
          <TouchableOpacity
            style={styles.addMemberBtn}
            onPress={() => setIsAddingMember(!isAddingMember)}>
            <Text style={styles.addMemberText}>
              {isAddingMember ? 'Đóng' : '+ Thêm người'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Box thêm thành viên từ danh bạ */}
        {isAddingMember && (
          <View style={styles.addMemberBox}>
            <Text style={styles.addMemberBoxTitle}>
              Chọn người dùng cần thêm vào nhóm:
            </Text>
            {nonGroupUsers.length === 0 ? (
              <Text style={styles.emptyText}>Tất cả bạn bè đã ở trong nhóm</Text>
            ) : (
              <FlatList
                data={nonGroupUsers}
                keyExtractor={u => u.uid}
                style={styles.addMemberListStyle}
                renderItem={({ item }) => {
                  const isSelected = selectedAddUids.includes(item.uid);
                  return (
                    <TouchableOpacity
                      style={styles.userPickItem}
                      onPress={() => toggleSelectAddUser(item.uid)}>
                      <Text style={styles.checkbox}>
                        {isSelected ? '☑️' : '⬜'}
                      </Text>
                      <UserAvatar uri={item.avatar} size={32} />
                      <Text style={styles.userPickName}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            {selectedAddUids.length > 0 && (
              <TouchableOpacity
                style={styles.confirmAddBtn}
                onPress={handleAddMembers}>
                <Text style={styles.confirmAddText}>
                  Xác nhận thêm ({selectedAddUids.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Danh sách thành viên hiện tại */}
        <FlatList
          data={memberUids}
          keyExtractor={uid => uid}
          contentContainerStyle={styles.memberList}
          renderItem={({ item: uid }) => {
            const isMe = uid === currentUid;
            const isGroupAdmin = Boolean(
              groupInfo.adminUids?.[uid] || groupInfo.createdBy === uid,
            );
            return (
              <View style={styles.memberItem}>
                <UserAvatar
                  uri={`https://i.pravatar.cc/150?u=${uid}`}
                  size={42}
                />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {isMe ? `${currentUserName} (Bạn)` : `Thành viên (${uid.slice(0, 5)})`}
                  </Text>
                  {isGroupAdmin && (
                    <Text style={styles.adminBadge}>Quản trị viên</Text>
                  )}
                </View>
              </View>
            );
          }}
        />

        {/* Nút Rời nhóm */}
        <TouchableOpacity
          style={styles.leaveGroupBtn}
          onPress={handleLeaveGroup}>
          <Text style={styles.leaveGroupText}>🚪 Rời khỏi nhóm</Text>
        </TouchableOpacity>
      </View>
    </Modal>
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
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  addMemberListStyle: {
    maxHeight: 180,
  },
  groupInfoCard: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.gray100,
  },
  groupAvatar: {
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  editIconBtn: {
    marginLeft: 8,
    padding: 4,
  },
  editIcon: {
    fontSize: 16,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
  },
  saveNameBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 6,
  },
  saveNameText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  cancelNameBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginLeft: 4,
  },
  cancelNameText: {
    color: COLORS.gray600,
  },
  memberCountText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addMemberBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addMemberText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  addMemberBox: {
    backgroundColor: COLORS.gray100,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  addMemberBoxTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray500,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  userPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    fontSize: 18,
    marginRight: 8,
  },
  userPickName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  confirmAddBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmAddText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  memberList: {
    paddingHorizontal: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  adminBadge: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  leaveGroupBtn: {
    margin: 16,
    backgroundColor: '#FFEBEA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  leaveGroupText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '700',
  },
});
