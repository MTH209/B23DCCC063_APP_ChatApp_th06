import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../../theme';
import { ChatMessage } from '../../types';

interface ChatInputBarProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onSendLocation: () => void;
  onSelectImage: (imageUri: string) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = React.memo(({
  inputText,
  onChangeText,
  onSend,
  onSendLocation,
  onSelectImage,
  replyingTo,
  onCancelReply,
  disabled = false,
}) => {
  const isSendDisabled = disabled || !inputText.trim();

  // Yêu cầu quyền truy cập Camera trên Android
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Quyền sử dụng máy ảnh',
          message: 'Ứng dụng cần quyền máy ảnh để bạn chụp và gửi ảnh ngay trong cuộc trò chuyện.',
          buttonNegative: 'Từ chối',
          buttonPositive: 'Đồng ý',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  // Mở menu lựa chọn: Chụp ảnh hoặc Chọn từ thư viện
  const handleCameraOptions = () => {
    Alert.alert(
      'Gửi hình ảnh',
      'Chọn phương thức bạn muốn:',
      [
        {
          text: '📸 Chụp ảnh mới',
          onPress: async () => {
            const hasPermission = await requestCameraPermission();
            if (!hasPermission) {
              Alert.alert(
                'Từ chối quyền',
                'Bạn đã từ chối quyền truy cập máy ảnh. Vui lòng cấp quyền trong Cài đặt để sử dụng tính năng chụp ảnh.',
              );
              return;
            }

            launchCamera(
              {
                mediaType: 'photo',
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 0.8,
                saveToPhotos: true,
              },
              response => {
                if (response.didCancel) return;
                if (response.errorCode) {
                  Alert.alert('Lỗi', response.errorMessage || 'Không thể chụp ảnh lúc này.');
                  return;
                }
                if (response.assets && response.assets.length > 0 && response.assets[0].uri) {
                  onSelectImage(response.assets[0].uri);
                }
              },
            );
          },
        },
        {
          text: '🖼️ Chọn từ thư viện',
          onPress: () => {
            launchImageLibrary(
              {
                mediaType: 'photo',
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 0.8,
                selectionLimit: 1,
              },
              response => {
                if (response.didCancel) return;
                if (response.errorCode) {
                  Alert.alert('Lỗi', response.errorMessage || 'Không thể chọn ảnh lúc này.');
                  return;
                }
                if (response.assets && response.assets.length > 0 && response.assets[0].uri) {
                  onSelectImage(response.assets[0].uri);
                }
              },
            );
          },
        },
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ],
    );
  };

  return (
    <View style={styles.outerContainer}>
      {/* Thanh hiển thị tin nhắn đang trả lời (Quote/Reply bar) */}
      {replyingTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyContent}>
            <Text style={styles.replyTitle}>
              Đang trả lời <Text style={styles.replySender}>{replyingTo.senderName || 'Người dùng'}</Text>
            </Text>
            <Text style={styles.replySnippet} numberOfLines={1}>
              {replyingTo.type === 'image'
                ? '📷 [Hình ảnh]'
                : replyingTo.type === 'location'
                ? '📍 [Vị trí]'
                : replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.cancelReplyBtn}
            onPress={onCancelReply}
            accessibilityLabel="Hủy trả lời">
            <Text style={styles.cancelReplyText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Thanh nhập liệu chính */}
      <View style={styles.inputContainer}>
        {/* Nút gửi ảnh 📷 */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleCameraOptions}
          accessibilityLabel="Chụp hoặc chọn ảnh">
          <Text style={styles.iconBtnText}>📷</Text>
        </TouchableOpacity>

        {/* Nút gửi vị trí 📍 */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onSendLocation}
          accessibilityLabel="Gửi vị trí hiện tại">
          <Text style={styles.iconBtnText}>📍</Text>
        </TouchableOpacity>

        {/* Ô nhập tin nhắn */}
        <TextInput
          style={styles.textInput}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={COLORS.gray500}
          value={inputText}
          onChangeText={onChangeText}
          multiline
        />

        {/* Nút gửi tin nhắn */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            isSendDisabled && styles.sendButtonDisabled,
          ]}
          onPress={onSend}
          disabled={isSendDisabled}
          accessibilityLabel="Gửi tin nhắn">
          <Text style={styles.sendText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.gray100,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  replyContent: {
    flex: 1,
  },
  replyTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  replySender: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  replySnippet: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  cancelReplyBtn: {
    padding: 6,
    marginLeft: 10,
  },
  cancelReplyText: {
    fontSize: 16,
    color: COLORS.gray600,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  iconBtn: {
    padding: 7,
    marginRight: 2,
  },
  iconBtnText: {
    fontSize: 22,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray400,
  },
  sendText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
