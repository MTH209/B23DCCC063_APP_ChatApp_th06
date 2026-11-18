import {
  ref,
  push,
  update,
  onValue,
  serverTimestamp,
} from 'firebase/database';
import { database } from './firebase';
import { ConversationModel } from '../types';

/**
 * Tạo một nhóm chat mới
 * @param name Tên nhóm
 * @param memberUids Danh sách UID của các thành viên (bao gồm cả người tạo)
 * @param creatorUid UID người tạo nhóm
 * @param creatorName Tên người tạo nhóm
 * @returns convId ID của cuộc trò chuyện nhóm mới
 */
export async function createGroup(
  name: string,
  memberUids: string[],
  creatorUid: string,
  creatorName: string,
): Promise<string> {
  const convListRef = ref(database, 'conversations');
  const newConvRef = push(convListRef);
  const convId = newConvRef.key!;

  const membersObj: Record<string, boolean> = {};
  memberUids.forEach(uid => {
    membersObj[uid] = true;
  });

  const now = serverTimestamp();
  const initialMessage = `${creatorName} đã tạo nhóm "${name}"`;

  const updates: Record<string, any> = {};

  // 1. Lưu thông tin nhóm trong conversations/{convId}
  updates[`conversations/${convId}`] = {
    id: convId,
    type: 'group',
    name,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    members: membersObj,
    adminUids: { [creatorUid]: true },
    createdBy: creatorUid,
    createdAt: now,
  };

  // 2. Tạo tin nhắn hệ thống đầu tiên
  const msgRef = push(ref(database, `messages/${convId}`));
  const msgId = msgRef.key!;
  updates[`messages/${convId}/${msgId}`] = {
    id: msgId,
    senderId: creatorUid,
    senderName: 'Hệ thống',
    type: 'system',
    text: initialMessage,
    createdAt: now,
  };

  // 3. Cập nhật danh sách chat userChats/{uid}/{convId} cho từng thành viên
  memberUids.forEach(uid => {
    updates[`userChats/${uid}/${convId}`] = {
      convId,
      type: 'group',
      name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      lastMessage: initialMessage,
      lastMessageTime: now,
      lastSenderId: creatorUid,
      unreadCount: uid === creatorUid ? 0 : 1,
    };

    // 4. Gửi thông báo cho thành viên khác (được thêm vào nhóm)
    if (uid !== creatorUid) {
      const notifRef = push(ref(database, `notifications/${uid}`));
      const notifId = notifRef.key!;
      updates[`notifications/${uid}/${notifId}`] = {
        id: notifId,
        type: 'group_added',
        convId,
        fromUid: creatorUid,
        fromName: creatorName,
        text: `Bạn đã được ${creatorName} thêm vào nhóm "${name}"`,
        createdAt: now,
        read: false,
        isRead: false,
      };
    }
  });

  await update(ref(database), updates);
  return convId;
}

/**
 * Lắng nghe thông tin chi tiết của một nhóm
 */
export function listenGroupInfo(
  convId: string,
  callback: (group: ConversationModel | null) => void,
): () => void {
  const groupRef = ref(database, `conversations/${convId}`);

  return onValue(groupRef, snapshot => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      callback({
        id: convId,
        type: 'group',
        name: val.name || 'Nhóm trò chuyện',
        avatar: val.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(val.name || 'Nhóm')}&background=random`,
        members: val.members || {},
        createdBy: val.createdBy || '',
        createdAt: val.createdAt || 0,
        adminUids: val.adminUids || {},
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Cập nhật tên nhóm (Phần C - Quản trị nhóm)
 */
export async function updateGroupName(
  convId: string,
  newName: string,
  updaterUid: string,
  updaterName: string,
  memberUids: string[],
): Promise<void> {
  const now = serverTimestamp();
  const sysText = `${updaterName} đã đổi tên nhóm thành "${newName}"`;

  const updates: Record<string, any> = {};
  updates[`conversations/${convId}/name`] = newName;
  updates[`conversations/${convId}/avatar`] = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=random`;

  const msgRef = push(ref(database, `messages/${convId}`));
  const msgId = msgRef.key!;
  updates[`messages/${convId}/${msgId}`] = {
    id: msgId,
    senderId: updaterUid,
    senderName: 'Hệ thống',
    type: 'system',
    text: sysText,
    createdAt: now,
  };

  memberUids.forEach(uid => {
    updates[`userChats/${uid}/${convId}/name`] = newName;
    updates[`userChats/${uid}/${convId}/avatar`] = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=random`;
    updates[`userChats/${uid}/${convId}/lastMessage`] = sysText;
    updates[`userChats/${uid}/${convId}/lastMessageTime`] = now;
  });

  await update(ref(database), updates);
}

/**
 * Thêm thành viên vào nhóm (Phần C - Quản trị nhóm)
 */
export async function addMembersToGroup(
  convId: string,
  groupName: string,
  newMemberUids: string[],
  addedByUid: string,
  addedByName: string,
  allMemberUids: string[],
): Promise<void> {
  const now = serverTimestamp();
  const updates: Record<string, any> = {};

  newMemberUids.forEach(uid => {
    updates[`conversations/${convId}/members/${uid}`] = true;
    updates[`userChats/${uid}/${convId}`] = {
      convId,
      type: 'group',
      name: groupName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random`,
      lastMessage: `${addedByName} đã thêm thành viên mới vào nhóm`,
      lastMessageTime: now,
      lastSenderId: addedByUid,
      unreadCount: 1,
    };

    const notifRef = push(ref(database, `notifications/${uid}`));
    const notifId = notifRef.key!;
    updates[`notifications/${uid}/${notifId}`] = {
      id: notifId,
      type: 'group_added',
      convId,
      fromUid: addedByUid,
      fromName: addedByName,
      text: `Bạn đã được ${addedByName} thêm vào nhóm "${groupName}"`,
      createdAt: now,
      read: false,
      isRead: false,
    };
  });

  const msgRef = push(ref(database, `messages/${convId}`));
  const msgId = msgRef.key!;
  updates[`messages/${convId}/${msgId}`] = {
    id: msgId,
    senderId: addedByUid,
    senderName: 'Hệ thống',
    type: 'system',
    text: `${addedByName} đã thêm ${newMemberUids.length} thành viên vào nhóm`,
    createdAt: now,
  };

  allMemberUids.forEach(uid => {
    updates[`userChats/${uid}/${convId}/lastMessage`] = `${addedByName} đã thêm thành viên vào nhóm`;
    updates[`userChats/${uid}/${convId}/lastMessageTime`] = now;
  });

  await update(ref(database), updates);
}

/**
 * Rời khỏi nhóm (Phần C - Quản trị nhóm)
 */
export async function leaveGroup(
  convId: string,
  uid: string,
  userName: string,
  remainingMemberUids: string[],
): Promise<void> {
  const now = serverTimestamp();
  const sysText = `${userName} đã rời nhóm`;

  const updates: Record<string, any> = {};
  updates[`conversations/${convId}/members/${uid}`] = null; // Xoá member khỏi nhóm
  updates[`userChats/${uid}/${convId}`] = null; // Xoá nhóm khỏi userChats của người rời

  const msgRef = push(ref(database, `messages/${convId}`));
  const msgId = msgRef.key!;
  updates[`messages/${convId}/${msgId}`] = {
    id: msgId,
    senderId: uid,
    senderName: 'Hệ thống',
    type: 'system',
    text: sysText,
    createdAt: now,
  };

  remainingMemberUids.forEach(mUid => {
    if (mUid !== uid) {
      updates[`userChats/${mUid}/${convId}/lastMessage`] = sysText;
      updates[`userChats/${mUid}/${convId}/lastMessageTime`] = now;
    }
  });

  await update(ref(database), updates);
}
