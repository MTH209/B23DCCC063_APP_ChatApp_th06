import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../theme';
import { UserProfile } from '../types';
import { listenUserProfile, updateUserProfile } from '../services/userService';
import { uploadImageToCloudinary } from '../services/uploadService';
import { useAuth } from '../context';
import { UserAvatar } from '../components/UserAvatar';

const SettingsScreen = ({ navigation }: { navigation: any }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }

    // Lắng nghe thông tin profile người dùng hiện tại
    const unsubscribe = listenUserProfile(user.uid, userProfile => {
      setProfile(userProfile);
      if (userProfile?.name) {
        setNewName(userProfile.name);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Đổi ảnh đại diện (Avatar)
  const handleChangeAvatar = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
        selectionLimit: 1,
      },
      async response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Lỗi', response.errorMessage || 'Không thể chọn ảnh lúc này');
          return;
        }

        if (response.assets && response.assets.length > 0 && response.assets[0].uri) {
          const imageUri = response.assets[0].uri;
          setIsUploadingAvatar(true);
          try {
            // Upload ảnh lên Cloudinary
            const uploadedUrl = await uploadImageToCloudinary(imageUri);
            if (user?.uid) {
              await updateUserProfile(user.uid, { avatar: uploadedUrl });
              Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện mới!');
            }
          } catch {
            Alert.alert('Lỗi', 'Không thể tải ảnh đại diện lên máy chủ.');
          } finally {
            setIsUploadingAvatar(false);
          }
        }
      },
    );
  };

  // Đổi họ tên hiển thị
  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Lỗi', 'Tên hiển thị không được để trống.');
      return;
    }

    if (user?.uid) {
      try {
        await updateUserProfile(user.uid, { name: trimmed });
        setIsEditingName(false);
        Alert.alert('Thành công', 'Đã cập nhật tên hiển thị!');
      } catch {
        Alert.alert('Lỗi', 'Không thể lưu tên hiển thị lúc này.');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          } catch {
            Alert.alert('Lỗi', 'Đăng xuất không thành công');
          }
        },
      },
    ]);
  };

  const displayName = profile?.name || user?.displayName || 'Người dùng';
  const displayEmail = profile?.email || user?.email || '';
  const avatarUri =
    profile?.avatar || `https://i.pravatar.cc/150?u=${user?.uid || 'default'}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cài đặt</Text>
      </View>

      {/* Hồ sơ cá nhân */}
      <View style={styles.profileSection}>
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={handleChangeAvatar}
          disabled={isUploadingAvatar}
          accessibilityLabel="Đổi ảnh đại diện">
          <UserAvatar uri={avatarUri} size={90} style={styles.avatar} />
          {isUploadingAvatar ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color={COLORS.white} />
            </View>
          ) : (
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeText}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.changeAvatarHint}>Nhấn để đổi ảnh đại diện</Text>

        {isEditingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.editNameInput}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName}>
              <Text style={styles.saveBtnText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setIsEditingName(false)}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{displayName}</Text>
            <TouchableOpacity
              onPress={() => setIsEditingName(true)}
              style={styles.editNameBtn}>
              <Text style={styles.editNameIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.profileEmail}>{displayEmail}</Text>
      </View>

      {/* Thông tin chi tiết */}
      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{displayEmail}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Tên hiển thị</Text>
          <Text style={styles.infoValue}>{displayName}</Text>
        </View>
      </View>

      {/* Nút Đăng xuất */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 45,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cameraBadgeText: {
    fontSize: 13,
  },
  changeAvatarHint: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  editNameBtn: {
    marginLeft: 8,
    padding: 4,
  },
  editNameIcon: {
    fontSize: 16,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  editNameInput: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    minWidth: 160,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 6,
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginLeft: 4,
  },
  cancelBtnText: {
    color: COLORS.gray600,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginHorizontal: 16,
  },
  logoutButton: {
    marginHorizontal: 16,
    backgroundColor: '#FFEBEA',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
  },
});

export default SettingsScreen;
