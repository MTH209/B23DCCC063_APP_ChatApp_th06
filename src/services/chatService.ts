import {
  ref,
  push,
  onValue,
  set,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  get,
  update,
  increment,
  onDisconnect,
} from 'firebase/database';
import { database } from './firebase';
import {
  ChatMessage,
  ConversationItem,
  ConversationType,
  MessageType,
} from '../types';

export type { ChatMessage, ConversationItem };

// Tạo Chat ID cố định và nhất quán giữa 2 người dùng (sắp xếp alphabet)
export function getChatId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// Khởi tạo hoặc đảm bảo node cuộc trò chuyện direct 1-1 tồn tại
export async function ensureDirectConversation(
  convId: string,
  uid1: string,
  uid2: string,
): Promise<void> {
  try {
    const convRef = ref(database, `conversations/${convId}`);
    const snap = await get(convRef);
    if (!snap.exists()) {
      await set(convRef, {
        id: convId,
        type: 'direct',
        members: {
          [uid1]: true,
          [uid2]: true,
        },
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('ensureDirectConversation error:', error);
  }
}

interface SendMessageParams {
  convId: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  type?: MessageType;
  text?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  memberUids: string[];
  convType?: ConversationType;
  convName?: string;
  convAvatar?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
    type: MessageType;
  };
}

/**
 * Gửi tin nhắn bằng MỘT LỆNH update() nhiều đường dẫn (Multi-path update)
 * Sử dụng increment(1) cho số tin chưa đọc của các thành viên khác
 */
export async function sendChatMessage({
  convId,
  senderUid,
  senderName,
  senderAvatar,
  type = 'text',
  text = '',
  imageUrl,
  latitude,
  longitude,
  memberUids,
  convType = 'direct',
  convName,
  convAvatar,
  replyTo,
}: SendMessageParams): Promise<string> {
  const messagesRef = ref(database, `messages/${convId}`);
  const newMsgRef = push(messagesRef);
  const msgId = newMsgRef.key!;

  // Xác định nội dung tóm tắt hiển thị ở danh sách hội thoại
  let summaryText = text;
  if (type === 'image') {
    summaryText = '📷 Hình ảnh';
  } else if (type === 'location') {
    summaryText = '📍 Vị trí';
  }

  const now = serverTimestamp();

  // Tạo đối tượng tin nhắn
  const messageData: Record<string, any> = {
    id: msgId,
    senderId: senderUid,
    senderName,
    type,
    createdAt: now,
    timestamp: now, // Tương thích ngược
  };

  if (senderAvatar) messageData.senderAvatar = senderAvatar;
  if (text) messageData.text = text;
  if (imageUrl) messageData.imageUrl = imageUrl;
  if (latitude !== undefined) messageData.latitude = latitude;
  if (longitude !== undefined) messageData.longitude = longitude;
  if (replyTo) messageData.replyTo = replyTo;

  // Thực hiện Multi-path update trong MỘT LỆNH duy nhất
  const updates: Record<string, any> = {};

  // 1. Ghi tin nhắn mới vào messages/{convId}/{msgId}
  updates[`messages/${convId}/${msgId}`] = messageData;

  // Tương thích ngược cho BT5 chats/{convId}/messages
  updates[`chats/${convId}/messages/${msgId}`] = messageData;

  // 2. Cập nhật userChats của người gửi (unreadCount = 0)
  updates[`userChats/${senderUid}/${convId}`] = {
    convId,
    chatId: convId,
    type: convType,
    name: convType === 'group' ? (convName || 'Nhóm') : '',
    avatar: convType === 'group' ? (convAvatar || '') : '',
    recipientId: convType === 'direct' ? memberUids.find(id => id !== senderUid) || '' : '',
    lastMessage: summaryText,
    lastMessageTime: now,
    lastSenderId: senderUid,
    unreadCount: 0,
  };
  // Tương thích ngược với BT5
  updates[`conversations/${senderUid}/${convId}`] = {
    recipientId: convType === 'direct' ? memberUids.find(id => id !== senderUid) || '' : '',
    lastMessage: summaryText,
    lastMessageTime: now,
    unreadCount: 0,
  };

  // 3. Cập nhật userChats cho các thành viên còn lại bằng increment(1)
  const otherMembers = memberUids.filter(uid => uid !== senderUid);
  for (const otherUid of otherMembers) {
    // Multi-path update với increment(1)
    updates[`userChats/${otherUid}/${convId}/convId`] = convId;
    updates[`userChats/${otherUid}/${convId}/chatId`] = convId;
    updates[`userChats/${otherUid}/${convId}/type`] = convType;
    updates[`userChats/${otherUid}/${convId}/name`] =
      convType === 'group' ? (convName || 'Nhóm') : senderName;
    updates[`userChats/${otherUid}/${convId}/avatar`] =
      convType === 'group' ? (convAvatar || '') : (senderAvatar || '');
    updates[`userChats/${otherUid}/${convId}/recipientId`] =
      convType === 'direct' ? senderUid : '';
    updates[`userChats/${otherUid}/${convId}/lastMessage`] = summaryText;
    updates[`userChats/${otherUid}/${convId}/lastMessageTime`] = now;
    updates[`userChats/${otherUid}/${convId}/lastSenderId`] = senderUid;
    updates[`userChats/${otherUid}/${convId}/unreadCount`] = increment(1);

    // Tương thích ngược BT5
    updates[`conversations/${otherUid}/${convId}/recipientId`] = senderUid;
    updates[`conversations/${otherUid}/${convId}/lastMessage`] = summaryText;
    updates[`conversations/${otherUid}/${convId}/lastMessageTime`] = now;
    updates[`conversations/${otherUid}/${convId}/unreadCount`] = increment(1);

    // 4. Tạo thông báo (notification) cho thành viên đó
    const notifRef = push(ref(database, `notifications/${otherUid}`));
    const notifId = notifRef.key!;
    const notifText =
      convType === 'group'
        ? `${senderName} [${convName || 'Nhóm'}]: ${summaryText}`
        : `${senderName}: ${summaryText}`;

    updates[`notifications/${otherUid}/${notifId}`] = {
      id: notifId,
      type: 'message',
      convId,
      fromUid: senderUid,
      fromName: senderName,
      text: notifText,
      content: notifText,
      createdAt: now,
      read: false,
      isRead: false,
    };
  }

  // Tắt trạng thái typing của người gửi khi gửi tin
  updates[`typing/${convId}/${senderUid}`] = false;

  // Nếu là direct chat, đảm bảo node conversations/{convId} tồn tại
  if (convType === 'direct') {
    updates[`conversations/${convId}/id`] = convId;
    updates[`conversations/${convId}/type`] = 'direct';
    updates[`conversations/${convId}/members/${senderUid}`] = true;
    otherMembers.forEach(uid => {
      updates[`conversations/${convId}/members/${uid}`] = true;
    });
  }

  try {
    await update(ref(database), updates);
  } catch (err: any) {
    console.warn('Lỗi multi-path update toàn phần:', err?.message);
    // Nếu multi-path update toàn phần bị lỗi (thường do Rules trên Firebase Console chưa cập nhật các path mới),
    // Fallback: ghi vào các path tương thích của BT5 để tin nhắn luôn được gửi thành công
    const fallbackUpdates: Record<string, any> = {};
    fallbackUpdates[`chats/${convId}/messages/${msgId}`] = messageData;
    fallbackUpdates[`messages/${convId}/${msgId}`] = messageData;
    fallbackUpdates[`conversations/${senderUid}/${convId}`] = {
      recipientId: convType === 'direct' ? memberUids.find(id => id !== senderUid) || '' : '',
      lastMessage: summaryText,
      lastMessageTime: now,
      unreadCount: 0,
    };
    for (const otherUid of otherMembers) {
      fallbackUpdates[`conversations/${otherUid}/${convId}`] = {
        recipientId: senderUid,
        lastMessage: summaryText,
        lastMessageTime: now,
        unreadCount: increment(1),
      };
    }
    try {
      await update(ref(database), fallbackUpdates);
    } catch (fallbackErr: any) {
      console.warn('Fallback update thất bại, thử set trực tiếp:', fallbackErr?.message);
      try {
        await set(ref(database, `chats/${convId}/messages/${msgId}`), messageData);
      } catch (setErr: any) {
        console.warn('Set trực tiếp cũng thất bại:', setErr?.message);
        throw new Error('Không thể gửi tin nhắn. Hãy kiểm tra kết nối mạng và Firebase Security Rules.');
      }
    }
  }

  return msgId;
}

// Wrapper gửi tin nhắn văn bản thông thường
export async function sendMessage(
  chatId: string,
  senderUid: string,
  recipientUid: string,
  text: string,
  senderName = 'Người dùng',
  senderAvatar = '',
  replyTo?: any,
): Promise<void> {
  await ensureDirectConversation(chatId, senderUid, recipientUid);
  await sendChatMessage({
    convId: chatId,
    senderUid,
    senderName,
    senderAvatar,
    type: 'text',
    text,
    memberUids: [senderUid, recipientUid],
    convType: 'direct',
    replyTo,
  });
}

// Wrapper gửi tin nhắn vị trí GPS
export async function sendLocationMessage(
  chatId: string,
  senderUid: string,
  recipientUid: string,
  latitude: number,
  longitude: number,
  senderName = 'Người dùng',
  senderAvatar = '',
): Promise<void> {
  await ensureDirectConversation(chatId, senderUid, recipientUid);
  await sendChatMessage({
    convId: chatId,
    senderUid,
    senderName,
    senderAvatar,
    type: 'location',
    text: '📍 Vị trí',
    latitude,
    longitude,
    memberUids: [senderUid, recipientUid],
    convType: 'direct',
  });
}

// Wrapper gửi tin nhắn ảnh
export async function sendImageMessage(
  chatId: string,
  senderUid: string,
  recipientUid: string,
  imageUrl: string,
  senderName = 'Người dùng',
  senderAvatar = '',
  replyTo?: any,
): Promise<void> {
  await ensureDirectConversation(chatId, senderUid, recipientUid);
  await sendChatMessage({
    convId: chatId,
    senderUid,
    senderName,
    senderAvatar,
    type: 'image',
    imageUrl,
    memberUids: [senderUid, recipientUid],
    convType: 'direct',
    replyTo,
  });
}

/**
 * Thu hồi tin nhắn: Đánh dấu recalled: true, không xóa node
 * Cập nhật dòng tin cuối ở màn hình Home nếu tin cuối bị thu hồi
 */
export async function recallMessage(
  convId: string,
  msgId: string,
  currentUid: string,
  memberUids: string[],
  isLast = false,
): Promise<void> {
  const updates: Record<string, any> = {};

  // 1. Đánh dấu recalled: true
  updates[`messages/${convId}/${msgId}/recalled`] = true;
  updates[`chats/${convId}/messages/${msgId}/recalled`] = true;

  // 2. Nếu là tin cuối của cuộc trò chuyện, cập nhật lastMessage ở Home
  if (isLast) {
    memberUids.forEach(uid => {
      updates[`userChats/${uid}/${convId}/lastMessage`] =
        'Tin nhắn đã được thu hồi';
      updates[`conversations/${uid}/${convId}/lastMessage`] =
        'Tin nhắn đã được thu hồi';
    });
  }

  await update(ref(database), updates);
}

/**
 * Thả hoặc thay đổi cảm xúc cho tin nhắn (👍 ❤️ 😂 😮 😢)
 * Gửi thông báo đến người gửi tin nếu người thả khác người gửi
 */
export async function toggleMessageReaction(
  convId: string,
  msgId: string,
  uid: string,
  userName: string,
  emoji: string,
  messageAuthorUid: string,
  existingReaction?: string,
): Promise<void> {
  const updates: Record<string, any> = {};
  const isRemove = existingReaction === emoji;

  // Nếu bấm lại cảm xúc đang có -> gỡ bỏ (null), ngược lại thì đặt emoji mới
  updates[`messages/${convId}/${msgId}/reactions/${uid}`] = isRemove
    ? null
    : emoji;
  updates[`chats/${convId}/messages/${msgId}/reactions/${uid}`] = isRemove
    ? null
    : emoji;

  // Nếu thả mới và không phải tự thả cho chính mình -> Gửi thông báo cho tác giả tin
  if (!isRemove && messageAuthorUid && messageAuthorUid !== uid) {
    const notifRef = push(ref(database, `notifications/${messageAuthorUid}`));
    const notifId = notifRef.key!;
    updates[`notifications/${messageAuthorUid}/${notifId}`] = {
      id: notifId,
      type: 'reaction',
      convId,
      fromUid: uid,
      fromName: userName,
      text: `${userName} đã thả cảm xúc ${emoji} vào tin nhắn của bạn`,
      content: `${userName} đã thả cảm xúc ${emoji} vào tin nhắn của bạn`,
      createdAt: serverTimestamp(),
      read: false,
      isRead: false,
    };
  }

  await update(ref(database), updates);
}

/**
 * Lắng nghe tin nhắn có phân trang (Pagination)
 * Lần đầu lấy limitToLast(limitCount) (mặc định 20 tin mới nhất)
 */
export function listenMessagesPaged(
  convId: string,
  limitCount = 20,
  callback: (messages: ChatMessage[]) => void,
): () => void {
  // Lấy từ node messages/${convId}
  const messagesQuery = query(
    ref(database, `messages/${convId}`),
    orderByChild('createdAt'),
    limitToLast(limitCount),
  );

  return onValue(
    messagesQuery,
    snapshot => {
      const list: ChatMessage[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const val = child.val();
          list.push({
            id: child.key!,
            ...val,
            createdAt: val.createdAt || val.timestamp || Date.now(),
          });
        });
      }

      // Nếu node messages/${convId} chưa có tin, kiểm tra fallback sang node chats/${convId}/messages (BT5 cũ)
      if (list.length === 0) {
        const fallbackRef = query(
          ref(database, `chats/${convId}/messages`),
          orderByChild('timestamp'),
          limitToLast(limitCount),
        );
        get(fallbackRef).then(fallbackSnap => {
          if (fallbackSnap.exists()) {
            const fallbackList: ChatMessage[] = [];
            fallbackSnap.forEach(child => {
              const val = child.val();
              fallbackList.push({
                id: child.key!,
                ...val,
                createdAt: val.createdAt || val.timestamp || Date.now(),
              });
            });
            callback(fallbackList);
          } else {
            callback([]);
          }
        }).catch(err => {
          console.warn('Fallback get messages error:', err);
          callback([]);
        });
        return;
      }

      callback(list);
    },
    error => {
      console.warn('listenMessagesPaged error:', error?.message);
      callback([]);
    },
  );
}

// Giữ lại hàm listenMessages cũ để tương thích
export function listenMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
): () => void {
  return listenMessagesPaged(chatId, 50, callback);
}

/**
 * Cập nhật trạng thái "đang soạn tin..."
 */
export async function setTypingStatus(
  convId: string,
  uid: string,
  isTyping: boolean,
): Promise<void> {
  try {
    const typingRef = ref(database, `typing/${convId}/${uid}`);
    if (isTyping) {
      await set(typingRef, true);
    } else {
      await set(typingRef, false);
    }
  } catch (error) {
    console.warn('setTypingStatus error:', error);
  }
}

/**
 * Thiết lập onDisconnect cho trạng thái gõ phím để không bị kẹt khi tắt app đột ngột
 */
export function setupTypingDisconnect(convId: string, uid: string): void {
  try {
    const typingRef = ref(database, `typing/${convId}/${uid}`);
    onDisconnect(typingRef).set(false).catch(() => {});
  } catch (error) {
    console.warn('setupTypingDisconnect error:', error);
  }
}

/**
 * Lắng nghe trạng thái đang soạn tin trong phòng chat
 */
export function listenTypingStatus(
  convId: string,
  currentUid: string,
  callback: (typingUserIds: string[]) => void,
): () => void {
  const typingRef = ref(database, `typing/${convId}`);

  return onValue(
    typingRef,
    snapshot => {
      const typingList: string[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          if (child.key !== currentUid && child.val() === true) {
            typingList.push(child.key!);
          }
        });
      }
      callback(typingList);
    },
    error => {
      console.warn('listenTypingStatus error:', error?.message);
      callback([]);
    },
  );
}

/**
 * Cập nhật trạng thái đã xem (readStatus) và reset unreadCount = 0
 */
export async function markAsRead(convId: string, uid: string): Promise<void> {
  try {
    const now = serverTimestamp();
    const updates: Record<string, any> = {};

    updates[`readStatus/${convId}/${uid}`] = now;
    updates[`userChats/${uid}/${convId}/unreadCount`] = 0;
    updates[`conversations/${uid}/${convId}/unreadCount`] = 0;

    await update(ref(database), updates);
  } catch (error) {
    console.warn('markAsRead error:', error);
  }
}

/**
 * Lắng nghe thời điểm đọc cuối cùng của các thành viên trong cuộc trò chuyện
 */
export function listenReadStatus(
  convId: string,
  callback: (status: Record<string, number>) => void,
): () => void {
  const readRef = ref(database, `readStatus/${convId}`);

  return onValue(
    readRef,
    snapshot => {
      const result: Record<string, number> = {};
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          result[child.key!] = child.val();
        });
      }
      callback(result);
    },
    error => {
      console.warn('listenReadStatus error:', error?.message);
      callback({});
    },
  );
}

/**
 * Lắng nghe danh sách cuộc trò chuyện ở màn hình Home (Hỗ trợ cả 1-1 và nhóm)
 */
export function listenConversations(
  uid: string,
  callback: (conversations: ConversationItem[]) => void,
): () => void {
  const userChatsRef = ref(database, `userChats/${uid}`);

  return onValue(
    userChatsRef,
    async snapshot => {
    const conversations: ConversationItem[] = [];

    if (snapshot.exists()) {
      const promises: Promise<void>[] = [];

      snapshot.forEach(child => {
        const data = child.val();
        const convId = child.key!;

        if (!data) return;

        const isGroup = data.type === 'group';

        if (isGroup) {
          conversations.push({
            chatId: convId,
            convId,
            type: 'group',
            name: data.name || 'Nhóm trò chuyện',
            avatar:
              data.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Nhóm')}&background=random`,
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.lastMessageTime || 0,
            lastSenderId: data.lastSenderId,
            unreadCount: data.unreadCount || 0,
          });
        } else {
          // Direct 1-1
          const recipientId =
            data.recipientId ||
            convId.split('_').find(id => id !== uid) ||
            '';

          if (recipientId) {
            const p = get(ref(database, `users/${recipientId}`))
              .then(userSnap => {
                const userData = userSnap.val() || {};
                conversations.push({
                  chatId: convId,
                  convId,
                  type: 'direct',
                  name: userData.name || data.name || 'Người dùng',
                  avatar:
                    userData.avatar ||
                    data.avatar ||
                    `https://i.pravatar.cc/150?u=${recipientId}`,
                  recipientId,
                  recipientName: userData.name || data.name || 'Người dùng',
                  recipientAvatar:
                    userData.avatar ||
                    data.avatar ||
                    `https://i.pravatar.cc/150?u=${recipientId}`,
                  recipientOnline: Boolean(userData.isOnline),
                  lastSeen: userData.lastSeen || 0,
                  lastMessage: data.lastMessage || '',
                  lastMessageTime: data.lastMessageTime || 0,
                  lastSenderId: data.lastSenderId,
                  unreadCount: data.unreadCount || 0,
                });
              })
              .catch(() => {
                conversations.push({
                  chatId: convId,
                  convId,
                  type: 'direct',
                  name: data.name || 'Người dùng',
                  avatar: `https://i.pravatar.cc/150?u=${recipientId}`,
                  recipientId,
                  recipientName: data.name || 'Người dùng',
                  recipientAvatar: `https://i.pravatar.cc/150?u=${recipientId}`,
                  recipientOnline: false,
                  lastMessage: data.lastMessage || '',
                  lastMessageTime: data.lastMessageTime || 0,
                  lastSenderId: data.lastSenderId,
                  unreadCount: data.unreadCount || 0,
                });
              });
            promises.push(p);
          }
        }
      });

      await Promise.all(promises);
      conversations.sort(
        (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0),
      );
      callback(conversations);
    } else {
      // Fallback cho các cuộc hội thoại cũ conversations/${uid} (BT5)
      const oldConvRef = ref(database, `conversations/${uid}`);
      get(oldConvRef).then(async oldSnap => {
        if (oldSnap.exists()) {
          const oldList: ConversationItem[] = [];
          const oldPromises: Promise<void>[] = [];

          oldSnap.forEach(child => {
            const data = child.val();
            const chatId = child.key!;
            if (!data || !data.recipientId) return;

            const p = get(ref(database, `users/${data.recipientId}`)).then(
              userSnap => {
                const userData = userSnap.val() || {};
                oldList.push({
                  chatId,
                  convId: chatId,
                  type: 'direct',
                  name: userData.name || 'Người dùng',
                  avatar:
                    userData.avatar ||
                    `https://i.pravatar.cc/150?u=${data.recipientId}`,
                  recipientId: data.recipientId,
                  recipientName: userData.name || 'Người dùng',
                  recipientAvatar:
                    userData.avatar ||
                    `https://i.pravatar.cc/150?u=${data.recipientId}`,
                  recipientOnline: Boolean(userData.isOnline),
                  lastSeen: userData.lastSeen || 0,
                  lastMessage: data.lastMessage || '',
                  lastMessageTime: data.lastMessageTime || 0,
                  unreadCount: data.unreadCount || 0,
                });
              },
            );
            oldPromises.push(p);
          });

          await Promise.all(oldPromises);
          oldList.sort(
            (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0),
          );
          callback(oldList);
        } else {
          callback([]);
        }
      }).catch(err => {
        console.warn('Fallback listenConversations error:', err);
        callback([]);
      });
    }
    },
    error => {
      console.warn('listenConversations error:', error?.message);
      callback([]);
    },
  );
}
