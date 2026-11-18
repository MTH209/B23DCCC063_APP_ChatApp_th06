import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { COLORS } from '../theme';
import { ChatMessage, UserProfile, ConversationModel } from '../types';
import {
  getChatId,
  sendChatMessage,
  listenMessagesPaged,
  markAsRead,
  setTypingStatus,
  setupTypingDisconnect,
  listenTypingStatus,
  listenReadStatus,
  recallMessage,
  toggleMessageReaction,
} from '../services/chatService';
import { listenUserProfile, listenAllUsers } from '../services/userService';
import { listenGroupInfo } from '../services/groupService';
import { uploadImageToCloudinary } from '../services/uploadService';
import { useAuth } from '../context';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatInputBar } from '../components/chat/ChatInputBar';
import { MessageActionModal } from '../components/chat/MessageActionModal';
import { ImageViewerModal } from '../components/chat/ImageViewerModal';
import { GroupDetailModal } from '../components/chat/GroupDetailModal';
import { requestLocationPermission, formatMessageTime } from '../utils';

const PAGE_SIZE = 20;

const ChatScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const {
    recipientId: paramRecipientId,
    recipientName: paramRecipientName,
    recipientAvatar: paramRecipientAvatar,
    convId: paramConvId,
    convType = 'direct',
  } = route.params || {};

  const { user } = useAuth();
  const currentUid = user?.uid || '';
  const currentUserName = user?.displayName || 'Người dùng';

  // Nhận diện direct chat vs group chat chuẩn xác
  const isDirectChat =
    convType === 'direct' ||
    Boolean(paramRecipientId) ||
    Boolean(paramConvId && paramConvId.includes('_'));
  const isGroup = convType === 'group' || (!isDirectChat && Boolean(paramConvId));

  // Tự động tìm recipientId nếu chưa có nhưng convId có dạng uid1_uid2
  let recipientId = paramRecipientId;
  if (!recipientId && paramConvId && paramConvId.includes('_')) {
    recipientId = paramConvId.split('_').find((id: string) => id !== currentUid) || '';
  }

  const convId = isGroup
    ? (paramConvId || '')
    : (recipientId && currentUid ? getChatId(currentUid, recipientId) : paramConvId || '');

  // State tin nhắn & phân trang
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [inputText, setInputText] = useState('');

  // State ảnh & tương tác
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // State thông tin đối phương / nhóm
  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(null);
  const [groupInfo, setGroupInfo] = useState<ConversationModel | null>(null);
  const [allUsersMap, setAllUsersMap] = useState<Record<string, UserProfile>>({});
  const [groupModalVisible, setGroupModalVisible] = useState(false);

  // State typing & readStatus
  const [typingUids, setTypingUids] = useState<string[]>([]);
  const [readStatusMap, setReadStatusMap] = useState<Record<string, number>>({});
  const typingTimerRef = useRef<any>(null);

  // State tìm kiếm tin nhắn
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const flatListRef = useRef<FlatList>(null);

  // 1. Setup onDisconnect cho trạng thái gõ phím & reset unread
  useEffect(() => {
    if (!convId || !currentUid) return;

    setupTypingDisconnect(convId, currentUid);
    markAsRead(convId, currentUid);

    return () => {
      // Khi rời màn hình: tắt trạng thái gõ phím
      setTypingStatus(convId, currentUid, false);
    };
  }, [convId, currentUid]);

  // 2. Lắng nghe tin nhắn phân trang (limitToLast(pageSize)) & HỦY trong cleanup
  useEffect(() => {
    if (!convId) return;

    const unsubscribe = listenMessagesPaged(convId, pageSize, list => {
      setMessages(list);
      setIsLoadingMore(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [convId, pageSize]);

  // 3. Đánh dấu đã đọc khi có tin nhắn mới tới lúc đang ở màn hình chat
  useEffect(() => {
    if (messages.length > 0 && currentUid && convId) {
      markAsRead(convId, currentUid);
    }
  }, [messages.length, convId, currentUid]);

  // 4. Lắng nghe trạng thái Typing trong phòng chat
  useEffect(() => {
    if (!convId || !currentUid) return;

    const unsubscribe = listenTypingStatus(convId, currentUid, list => {
      setTypingUids(list);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [convId, currentUid]);

  // 5. Lắng nghe thời điểm xem tin nhắn (readStatus)
  useEffect(() => {
    if (!convId) return;

    const unsubscribe = listenReadStatus(convId, status => {
      setReadStatusMap(status);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [convId]);

  // 6. Lắng nghe thông tin người nhận (nếu là direct chat 1-1)
  useEffect(() => {
    if (isGroup || !recipientId) return;

    const unsubscribe = listenUserProfile(recipientId, profile => {
      setRecipientProfile(profile);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isGroup, recipientId]);

  // 7. Lắng nghe thông tin nhóm (nếu là group chat)
  useEffect(() => {
    if (!isGroup || !convId) return;

    const unsubscribe = listenGroupInfo(convId, info => {
      setGroupInfo(info);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isGroup, convId]);

  // 8. Lắng nghe danh sách tất cả user để lấy tên/avatar trong group
  useEffect(() => {
    if (!currentUid) return;

    const unsubscribe = listenAllUsers(currentUid, userList => {
      const map: Record<string, UserProfile> = {};
      userList.forEach(u => {
        map[u.uid] = u;
      });
      setAllUsersMap(map);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUid]);

  // Danh sách thành viên trong cuộc trò chuyện
  const memberUids = useMemo(() => {
    if (isGroup && groupInfo?.members) {
      return Object.keys(groupInfo.members);
    }
    if (recipientId && currentUid) {
      return [currentUid, recipientId];
    }
    if (convId && convId.includes('_')) {
      return convId.split('_');
    }
    return [currentUid];
  }, [isGroup, groupInfo, recipientId, currentUid, convId]);

  // Xử lý khi người dùng nhập văn bản (typing indicator & auto tắt sau 3s)
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!convId || !currentUid) return;

    // Đánh dấu đang gõ
    setTypingStatus(convId, currentUid, true);

    // Reset timer 3s
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      setTypingStatus(convId, currentUid, false);
    }, 3000);
  };

  // Gửi tin nhắn văn bản
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !convId || !currentUid) return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    setTypingStatus(convId, currentUid, false);
    setInputText('');

    const currentReply = replyingTo;
    setReplyingTo(null);

    try {
      await sendChatMessage({
        convId,
        senderUid: currentUid,
        senderName: currentUserName,
        type: 'text',
        text: trimmed,
        memberUids,
        convType: isGroup ? 'group' : 'direct',
        convName: groupInfo?.name || paramRecipientName,
        replyTo: currentReply
          ? {
              id: currentReply.id,
              text: currentReply.text || '',
              senderName: currentReply.senderName || 'Người dùng',
              type: currentReply.type,
            }
          : undefined,
      });
    } catch (error: any) {
      console.warn('Lỗi sendChatMessage:', error);
      Alert.alert(
        'Lỗi',
        error?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại!',
      );
    }
  };

  // Gửi vị trí GPS
  const handleSendLocation = async () => {
    if (!convId || !currentUid) return;

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Từ chối quyền',
        'Ứng dụng không có quyền vị trí. Vui lòng cấp quyền trong Cài đặt máy để chia sẻ vị trí.',
      );
      return;
    }

    Geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        try {
          await sendChatMessage({
            convId,
            senderUid: currentUid,
            senderName: currentUserName,
            type: 'location',
            text: '📍 Vị trí',
            latitude,
            longitude,
            memberUids,
            convType: isGroup ? 'group' : 'direct',
            convName: groupInfo?.name || paramRecipientName,
          });
        } catch (locErr: any) {
          console.warn('Lỗi gửi vị trí:', locErr);
          Alert.alert('Lỗi', locErr?.message || 'Không thể gửi vị trí lúc này.');
        }
      },
      () => {
        Alert.alert(
          'Lỗi GPS',
          'Không thể lấy vị trí hiện tại. Hãy bật GPS và thử lại!',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  // Bắt đầu quy trình gửi ảnh (Hiển thị bong bóng tạm, upload Cloudinary, gửi tin)
  const handleSelectImage = useCallback(
    async (localUri: string) => {
      if (!convId || !currentUid) return;

      const tempId = `temp_${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        senderId: currentUid,
        senderName: currentUserName,
        type: 'image',
        localUri,
        createdAt: Date.now(),
        isUploading: true,
        uploadFailed: false,
      };

      setOptimisticMessages(prev => [...prev, optimisticMsg]);

      try {
        const imageUrl = await uploadImageToCloudinary(localUri);

        await sendChatMessage({
          convId,
          senderUid: currentUid,
          senderName: currentUserName,
          type: 'image',
          imageUrl,
          memberUids,
          convType: isGroup ? 'group' : 'direct',
          convName: groupInfo?.name || paramRecipientName,
          replyTo: replyingTo
            ? {
                id: replyingTo.id,
                text: replyingTo.text || '',
                senderName: replyingTo.senderName || 'Người dùng',
                type: replyingTo.type,
              }
            : undefined,
        });

        setReplyingTo(null);
        setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      } catch (error: any) {
        const errMsg = error?.message || 'Lỗi không xác định';
        console.warn('Upload ảnh thất bại:', errMsg);
        Alert.alert('Lỗi tải ảnh', errMsg);
        setOptimisticMessages(prev =>
          prev.map(m =>
            m.id === tempId ? { ...m, isUploading: false, uploadFailed: true } : m,
          ),
        );
      }
    },
    [convId, currentUid, currentUserName, memberUids, isGroup, groupInfo?.name, paramRecipientName, replyingTo],
  );

  // Thử lại upload ảnh
  const handleRetryUpload = useCallback(
    (msg: ChatMessage) => {
      if (!msg.localUri) return;
      setOptimisticMessages(prev => prev.filter(m => m.id !== msg.id));
      handleSelectImage(msg.localUri);
    },
    [handleSelectImage],
  );

  // Thu hồi tin nhắn
  const handleRecall = useCallback(
    async (msg: ChatMessage) => {
      try {
        const isLast = messages.length > 0 && messages[messages.length - 1].id === msg.id;
        await recallMessage(convId, msg.id, currentUid, memberUids, isLast);
      } catch {
        Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn lúc này.');
      }
    },
    [convId, currentUid, memberUids, messages],
  );

  // Thả hoặc gỡ cảm xúc
  const handleToggleReaction = useCallback(
    async (msg: ChatMessage, emoji: string) => {
      try {
        const existingEmoji = msg.reactions?.[currentUid];
        await toggleMessageReaction(
          convId,
          msg.id,
          currentUid,
          currentUserName,
          emoji,
          msg.senderId,
          existingEmoji,
        );
      } catch {
        Alert.alert('Lỗi', 'Không thể cập nhật cảm xúc lúc này.');
      }
    },
    [convId, currentUid, currentUserName],
  );

  // Tải thêm tin nhắn cũ khi kéo lên đầu (Pagination)
  const handleLoadMore = () => {
    if (isLoadingMore || messages.length < pageSize) return;
    setIsLoadingMore(true);
    setPageSize(prev => prev + PAGE_SIZE);
  };

  // Tổng hợp tin nhắn thật và tin tạm thời
  const allMessagesCombined = useMemo(() => {
    return [...messages, ...optimisticMessages];
  }, [messages, optimisticMessages]);

  // Lọc theo tìm kiếm
  const displayMessages = useMemo(() => {
    if (!searchQuery.trim()) return allMessagesCombined;
    return allMessagesCombined.filter(
      m =>
        m.text &&
        m.text.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    );
  }, [allMessagesCombined, searchQuery]);

  // Cuộn tới tin nhắn đang trả lời
  const handleScrollToRepliedMessage = useCallback(
    (targetMsgId: string) => {
      const idx = displayMessages.findIndex(m => m.id === targetMsgId);
      if (idx !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: idx, animated: true });
      }
    },
    [displayMessages],
  );

  // Tin nhắn cuối cùng (dùng để hiển thị Đã gửi / Đã xem)
  const lastMsg = allMessagesCombined.length > 0
    ? allMessagesCombined[allMessagesCombined.length - 1]
    : null;

  // Tính trạng thái Đã gửi / Đã xem cho tin cuối cùng của mình
  let seenStatus = '';
  if (lastMsg && lastMsg.senderId === currentUid && !lastMsg.recalled) {
    const msgCreatedAt = lastMsg.createdAt || lastMsg.timestamp || 0;

    if (!isGroup && recipientId) {
      const recipientReadTime = readStatusMap[recipientId] || 0;
      if (recipientReadTime >= msgCreatedAt) {
        seenStatus = `Đã xem (${formatMessageTime(recipientReadTime)})`;
      } else {
        seenStatus = 'Đã gửi';
      }
    } else if (isGroup) {
      // Trong group chat
      const readers = memberUids.filter(
        (uid: string) => uid !== currentUid && (readStatusMap[uid] || 0) >= msgCreatedAt,
      );
      if (readers.length > 0) {
        seenStatus = `Đã xem (${readers.length})`;
      } else {
        seenStatus = 'Đã gửi';
      }
    }
  }

  // Đếm số thành viên online trong nhóm
  const groupOnlineCount = useMemo(() => {
    if (!isGroup || !groupInfo?.members) return 0;
    let count = 0;
    Object.keys(groupInfo.members).forEach(uid => {
      if (allUsersMap[uid]?.isOnline) count += 1;
    });
    return count;
  }, [isGroup, groupInfo, allUsersMap]);

  // Tên và Avatar hiển thị
  const recipientDisplayName =
    recipientProfile?.name || paramRecipientName || 'Người dùng';
  const recipientDisplayAvatar =
    recipientProfile?.avatar ||
    paramRecipientAvatar ||
    `https://i.pravatar.cc/150?u=${recipientId || 'user'}`;

  // Tên và Avatar hiển thị ở Header
  const headerName = isGroup
    ? (groupInfo?.name || paramRecipientName || 'Nhóm trò chuyện')
    : recipientDisplayName;

  const headerAvatar = isGroup
    ? (groupInfo?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(headerName)}&background=random`)
    : recipientDisplayAvatar;

  const isOnline = Boolean(recipientProfile?.isOnline);
  const isTyping = typingUids.length > 0;
  const typingText = isGroup
    ? `${allUsersMap[typingUids[0]]?.name || 'Một thành viên'} đang soạn tin...`
    : 'đang soạn tin...';

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMe = item.senderId === currentUid;
      const isLast = lastMsg?.id === item.id;
      const senderAvatar = isMe
        ? ''
        : allUsersMap[item.senderId]?.avatar || recipientDisplayAvatar;

      return (
        <MessageBubble
          message={item}
          isMe={isMe}
          isGroup={isGroup}
          recipientAvatar={senderAvatar}
          isLastMessage={isLast}
          seenStatus={isLast ? seenStatus : undefined}
          onLongPress={msg => {
            setSelectedMessage(msg);
            setActionModalVisible(true);
          }}
          onPressImage={url => setPreviewImageUrl(url)}
          onPressReplyTo={handleScrollToRepliedMessage}
          onToggleReaction={handleToggleReaction}
          onRetryUpload={handleRetryUpload}
        />
      );
    },
    [
      currentUid,
      isGroup,
      lastMsg,
      seenStatus,
      recipientDisplayAvatar,
      allUsersMap,
      handleRetryUpload,
      handleScrollToRepliedMessage,
      handleToggleReaction,
    ],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Header cuộc trò chuyện */}
      <ChatHeader
        name={headerName}
        avatar={headerAvatar}
        isOnline={isOnline}
        isGroup={isGroup}
        onlineCount={groupOnlineCount}
        totalMembersCount={memberUids.length}
        isTyping={isTyping}
        typingText={typingText}
        lastSeen={recipientProfile?.lastSeen}
        onBack={() => navigation.goBack()}
        onHeaderPress={isGroup ? () => setGroupModalVisible(true) : undefined}
        onSearchPress={() => setIsSearching(!isSearching)}
      />

      {/* Thanh tìm kiếm tin nhắn trong phòng chat */}
      {isSearching && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tin nhắn trong cuộc trò chuyện..."
            placeholderTextColor={COLORS.gray500}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity
            style={styles.closeSearchBtn}
            onPress={() => {
              setIsSearching(false);
              setSearchQuery('');
            }}>
            <Text style={styles.closeSearchText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Danh sách tin nhắn */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onStartReached={handleLoadMore}
        onStartReachedThreshold={0.2}
        onContentSizeChange={() => {
          if (!searchQuery) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onLayout={() => {
          if (!searchQuery) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {/* Thanh nhập liệu */}
      <ChatInputBar
        inputText={inputText}
        onChangeText={handleInputChange}
        onSend={handleSend}
        onSendLocation={handleSendLocation}
        onSelectImage={handleSelectImage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Modal menu nhấn giữ tin nhắn */}
      <MessageActionModal
        visible={actionModalVisible}
        message={selectedMessage}
        isMe={selectedMessage?.senderId === currentUid}
        onClose={() => setActionModalVisible(false)}
        onRecall={handleRecall}
        onReact={handleToggleReaction}
        onReply={msg => setReplyingTo(msg)}
      />

      {/* Modal xem ảnh phóng to */}
      <ImageViewerModal
        visible={Boolean(previewImageUrl)}
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />

      {/* Modal chi tiết và quản trị nhóm */}
      {isGroup && (
        <GroupDetailModal
          visible={groupModalVisible}
          convId={convId}
          groupInfo={groupInfo}
          currentUid={currentUid}
          currentUserName={currentUserName}
          onClose={() => setGroupModalVisible(false)}
          onLeaveGroupSuccess={() => navigation.goBack()}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.gray100,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  closeSearchBtn: {
    padding: 8,
    marginLeft: 6,
  },
  closeSearchText: {
    fontSize: 16,
    color: COLORS.gray600,
    fontWeight: '700',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

export default ChatScreen;
