import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../../theme';
import { ChatMessage } from '../../types';
import { UserAvatar } from '../UserAvatar';
import { formatMessageTime, openGoogleMaps } from '../../utils';

interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  recipientAvatar: string;
  isGroup?: boolean;
  isLastMessage?: boolean;
  seenStatus?: string; // 'Đã gửi' hoặc 'Đã xem (14:30)'
  onLongPress: (message: ChatMessage) => void;
  onPressImage?: (imageUrl: string) => void;
  onPressReplyTo?: (targetMsgId: string) => void;
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  onRetryUpload?: (message: ChatMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  isMe,
  recipientAvatar,
  isGroup = false,
  isLastMessage = false,
  seenStatus,
  onLongPress,
  onPressImage,
  onPressReplyTo,
  onToggleReaction,
  onRetryUpload,
}) => {
  // 1. Tin nhắn hệ thống (vd: A đã tạo nhóm, B đã rời nhóm)
  if (message.type === 'system') {
    return (
      <View style={styles.systemMessageContainer}>
        <View style={styles.systemBadge}>
          <Text style={styles.systemText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  const isLocation = message.type === 'location';
  const isImage = message.type === 'image';
  const isRecalled = Boolean(message.recalled);

  const handleOpenMap = () => {
    if (!isRecalled && isLocation) {
      openGoogleMaps(message.latitude, message.longitude);
    }
  };

  const handleImagePress = () => {
    if (!isRecalled && isImage && message.imageUrl && onPressImage) {
      onPressImage(message.imageUrl);
    }
  };

  // Gom nhóm các biểu tượng cảm xúc và đếm số lượng
  const reactionCounts: Record<string, number> = {};
  if (message.reactions) {
    Object.values(message.reactions).forEach(emoji => {
      if (emoji) {
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      }
    });
  }
  const reactionEntries = Object.entries(reactionCounts);

  const displayAvatar =
    message.senderAvatar || recipientAvatar || `https://i.pravatar.cc/150?u=${message.senderId}`;

  return (
    <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
      {/* Avatar người gửi (chỉ hiển thị với người khác) */}
      {!isMe && (
        <UserAvatar
          uri={displayAvatar}
          size={32}
          style={styles.messageAvatar}
        />
      )}

      <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
        {/* Tên người gửi trong nhóm chat */}
        {isGroup && !isMe && !isRecalled && (
          <Text style={styles.senderName} numberOfLines={1}>
            {message.senderName || 'Thành viên'}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.messageBubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isRecalled && styles.bubbleRecalled,
            isLocation && !isRecalled && (isMe ? styles.bubbleLocationMe : styles.bubbleLocationOther),
            isImage && !isRecalled && styles.bubbleImage,
          ]}
          onPress={() => {
            if (isLocation) handleOpenMap();
            else if (isImage) handleImagePress();
          }}
          onLongPress={() => onLongPress(message)}
          delayLongPress={280}
          activeOpacity={0.85}>
          {/* Hộp trích dẫn tin nhắn đang trả lời (Quote/Reply) */}
          {message.replyTo && !isRecalled && (
            <TouchableOpacity
              style={[
                styles.replyQuoteBox,
                isMe ? styles.replyQuoteBoxMe : styles.replyQuoteBoxOther,
              ]}
              onPress={() => onPressReplyTo && onPressReplyTo(message.replyTo!.id)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.replyQuoteSender,
                  isMe ? styles.replyQuoteSenderMe : styles.replyQuoteSenderOther,
                ]}>
                {message.replyTo.senderName}
              </Text>
              <Text
                style={[
                  styles.replyQuoteText,
                  isMe ? styles.replyQuoteTextMe : styles.replyQuoteTextOther,
                ]}
                numberOfLines={1}>
                {message.replyTo.type === 'image'
                  ? '📷 [Hình ảnh]'
                  : message.replyTo.type === 'location'
                  ? '📍 [Vị trí]'
                  : message.replyTo.text}
              </Text>
            </TouchableOpacity>
          )}

          {/* Nội dung tin nhắn */}
          {isRecalled ? (
            <Text style={styles.recalledText}>
              🚫 Tin nhắn đã được thu hồi
            </Text>
          ) : isImage ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: message.imageUrl || message.localUri }}
                style={styles.chatImage}
                resizeMode="cover"
              />
              {/* Vòng xoay loading khi đang upload */}
              {message.isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.uploadingText}>Đang tải lên...</Text>
                </View>
              )}
              {/* Nút thử lại nếu upload lỗi */}
              {message.uploadFailed && (
                <TouchableOpacity
                  style={styles.retryOverlay}
                  onPress={() => onRetryUpload && onRetryUpload(message)}>
                  <Text style={styles.retryIcon}>⚠️</Text>
                  <Text style={styles.retryText}>Tải lỗi. Thử lại</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : isLocation ? (
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={[styles.locationTitle, isMe && styles.messageTextMe]}>
                Vị trí đã chia sẻ
              </Text>
              <Text
                style={[
                  styles.locationHint,
                  isMe ? styles.locationHintMe : styles.locationHintOther,
                ]}>
                Nhấn để mở Google Maps ↗
              </Text>
            </View>
          ) : (
            <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
              {message.text}
            </Text>
          )}

          {/* Thời gian gửi tin nhắn */}
          <Text
            style={[
              styles.messageTime,
              isMe && styles.messageTimeMe,
              isRecalled && styles.messageTimeRecalled,
            ]}>
            {formatMessageTime(message.createdAt || message.timestamp)}
          </Text>
        </TouchableOpacity>

        {/* Thanh hiển thị cảm xúc (Reactions) dưới bong bóng tin */}
        {reactionEntries.length > 0 && !isRecalled && (
          <View
            style={[
              styles.reactionBadgeRow,
              isMe ? styles.reactionBadgeRowMe : styles.reactionBadgeRowOther,
            ]}>
            {reactionEntries.map(([emoji, count]) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionPill}
                onPress={() => onToggleReaction && onToggleReaction(message, emoji)}
                activeOpacity={0.7}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                {count > 1 && (
                  <Text style={styles.reactionCount}>{count}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Trạng thái "Đã gửi" hoặc "Đã xem (14:35)" cho tin cuối của mình */}
        {isMe && isLastMessage && seenStatus && (
          <Text style={styles.seenStatusText}>{seenStatus}</Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    marginRight: 8,
    marginBottom: 2,
  },
  bubbleWrapper: {
    maxWidth: '75%',
    alignItems: 'flex-start',
  },
  bubbleWrapperMe: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 3,
    marginLeft: 6,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.gray100,
    borderBottomLeftRadius: 4,
  },
  bubbleRecalled: {
    backgroundColor: COLORS.gray200,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.gray400,
  },
  bubbleLocationMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleLocationOther: {
    backgroundColor: '#E8F0FE',
    borderBottomLeftRadius: 4,
  },
  bubbleImage: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  messageTextMe: {
    color: COLORS.white,
  },
  recalledText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.gray600,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.75)',
  },
  messageTimeRecalled: {
    color: COLORS.gray500,
  },
  // Style cho ảnh trong tin nhắn
  imageContainer: {
    width: 220,
    height: 165,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.gray200,
  },
  chatImage: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: COLORS.white,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  retryOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(220, 53, 69, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryIcon: {
    fontSize: 22,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  // Vị trí
  locationContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  locationIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  locationHint: {
    fontSize: 11,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  locationHintMe: {
    color: 'rgba(255,255,255,0.85)',
  },
  locationHintOther: {
    color: COLORS.primary,
  },
  // Phản ứng (Reactions)
  reactionBadgeRow: {
    flexDirection: 'row',
    marginTop: -8,
    zIndex: 2,
  },
  reactionBadgeRowMe: {
    marginRight: 6,
  },
  reactionBadgeRowOther: {
    marginLeft: 6,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginLeft: 3,
  },
  // Hộp Quote/Reply
  replyQuoteBox: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  replyQuoteBoxMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderLeftColor: COLORS.white,
  },
  replyQuoteBoxOther: {
    backgroundColor: COLORS.gray200,
    borderLeftColor: COLORS.primary,
  },
  replyQuoteSender: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 1,
  },
  replyQuoteSenderMe: {
    color: COLORS.white,
  },
  replyQuoteSenderOther: {
    color: COLORS.primary,
  },
  replyQuoteText: {
    fontSize: 12,
  },
  replyQuoteTextMe: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  replyQuoteTextOther: {
    color: COLORS.textSecondary,
  },
  // Tin nhắn hệ thống
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemBadge: {
    backgroundColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  systemText: {
    fontSize: 12,
    color: COLORS.gray600,
    fontStyle: 'italic',
  },
  // Trạng thái đã xem/đã gửi
  seenStatusText: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 2,
    marginRight: 4,
    alignSelf: 'flex-end',
  },
});
