import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { COLORS } from '../../theme';
import { ChatMessage } from '../../types';

interface MessageActionModalProps {
  visible: boolean;
  message: ChatMessage | null;
  isMe: boolean;
  onClose: () => void;
  onRecall: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onReply?: (message: ChatMessage) => void;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

export const MessageActionModal: React.FC<MessageActionModalProps> = ({
  visible,
  message,
  isMe,
  onClose,
  onRecall,
  onReact,
  onReply,
}) => {
  if (!message) return null;

  const isRecalled = Boolean(message.recalled);
  const isText = message.type === 'text';

  const handleCopy = () => {
    if (message.text) {
      Clipboard.setString(message.text);
      Alert.alert('Thông báo', 'Đã sao chép nội dung tin nhắn vào bộ nhớ tạm');
    }
    onClose();
  };

  const handleRecallPress = () => {
    Alert.alert(
      'Thu hồi tin nhắn',
      'Bạn có chắc chắn muốn thu hồi tin nhắn này không? Tin nhắn sẽ được thu hồi ở phía tất cả mọi người.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: () => {
            onRecall(message);
            onClose();
          },
        },
      ],
    );
  };

  const handleEmojiPress = (emoji: string) => {
    onReact(message, emoji);
    onClose();
  };

  const handleReplyPress = () => {
    if (onReply) {
      onReply(message);
    }
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              {/* Thanh biểu tượng cảm xúc nổi bên trên */}
              {!isRecalled && (
                <View style={styles.reactionBar}>
                  {EMOJIS.map(emoji => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.emojiBtn}
                      onPress={() => handleEmojiPress(emoji)}
                      activeOpacity={0.7}>
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Danh sách hành động menu */}
              <View style={styles.actionList}>
                {/* 1. Nút Sao chép */}
                {isText && !isRecalled && (
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleCopy}>
                    <Text style={styles.actionIcon}>📋</Text>
                    <Text style={styles.actionLabel}>Sao chép</Text>
                  </TouchableOpacity>
                )}

                {/* 2. Nút Trả lời (Reply) */}
                {!isRecalled && (
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={handleReplyPress}>
                    <Text style={styles.actionIcon}>↩️</Text>
                    <Text style={styles.actionLabel}>Trả lời</Text>
                  </TouchableOpacity>
                )}

                {/* 3. Nút Thu hồi (Chỉ hiển thị với tin nhắn của chính mình và chưa thu hồi) */}
                {isMe && !isRecalled && (
                  <TouchableOpacity
                    style={[styles.actionItem, styles.destructiveItem]}
                    onPress={handleRecallPress}>
                    <Text style={styles.actionIcon}>🗑️</Text>
                    <Text style={[styles.actionLabel, styles.destructiveText]}>
                      Thu hồi tin nhắn
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuContainer: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  reactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: COLORS.gray100,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  emojiBtn: {
    padding: 6,
    borderRadius: 20,
  },
  emojiText: {
    fontSize: 26,
  },
  actionList: {
    paddingVertical: 6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 14,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  destructiveItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  destructiveText: {
    color: COLORS.error,
  },
});
