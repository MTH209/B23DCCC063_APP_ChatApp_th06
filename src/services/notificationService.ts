import {
  ref,
  onValue,
  push,
  set,
  update,
  serverTimestamp,
} from 'firebase/database';
import { database } from './firebase';
import { Notification } from '../types';

/**
 * Lắng nghe danh sách thông báo realtime của người dùng
 */
export function listenNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void,
): () => void {
  const notifRef = ref(database, `notifications/${uid}`);

  return onValue(
    notifRef,
    snapshot => {
      const list: Notification[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const val = child.val();
          list.push({
            id: child.key!,
            type: val.type || 'message',
            convId: val.convId || '',
            fromUid: val.fromUid || '',
            fromName: val.fromName || 'Người dùng',
            text: val.text || val.content || '',
            content: val.text || val.content || '',
            createdAt: val.createdAt || val.timestamp || Date.now(),
            read: Boolean(val.read ?? val.isRead ?? false),
            isRead: Boolean(val.read ?? val.isRead ?? false),
          });
        });
      }
      // Sắp xếp thông báo mới nhất lên đầu
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    },
    error => {
      console.warn('listenNotifications error:', error);
    },
  );
}

/**
 * Lắng nghe số lượng thông báo chưa đọc
 */
export function listenUnreadNotificationCount(
  uid: string,
  callback: (count: number) => void,
): () => void {
  const notifRef = ref(database, `notifications/${uid}`);

  return onValue(notifRef, snapshot => {
    let unread = 0;
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const val = child.val();
        if (!val.read && !val.isRead) {
          unread += 1;
        }
      });
    }
    callback(unread);
  });
}

/**
 * Đánh dấu một thông báo là đã đọc
 */
export async function markNotificationAsRead(
  uid: string,
  notificationId: string,
): Promise<void> {
  try {
    const notifItemRef = ref(database, `notifications/${uid}/${notificationId}`);
    await update(notifItemRef, {
      read: true,
      isRead: true,
    });
  } catch (error) {
    console.warn('markNotificationAsRead error:', error);
  }
}

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
export async function markAllNotificationsAsRead(uid: string): Promise<void> {
  try {
    const notifRef = ref(database, `notifications/${uid}`);
    return new Promise(resolve => {
      onValue(
        notifRef,
        async snapshot => {
          if (!snapshot.exists()) {
            resolve();
            return;
          }
          const updates: Record<string, any> = {};
          snapshot.forEach(child => {
            if (!child.val().read) {
              updates[`notifications/${uid}/${child.key}/read`] = true;
              updates[`notifications/${uid}/${child.key}/isRead`] = true;
            }
          });
          if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
          }
          resolve();
        },
        { onlyOnce: true },
      );
    });
  } catch (error) {
    console.warn('markAllNotificationsAsRead error:', error);
  }
}

/**
 * Gửi thông báo đến một người dùng cụ thể
 */
export async function sendNotification(
  recipientUid: string,
  data: {
    type: 'message' | 'group_added' | 'reaction' | 'system';
    convId: string;
    fromUid: string;
    fromName: string;
    text: string;
  },
): Promise<void> {
  try {
    const notifRef = ref(database, `notifications/${recipientUid}`);
    const newNotifRef = push(notifRef);
    await set(newNotifRef, {
      ...data,
      createdAt: serverTimestamp(),
      read: false,
      isRead: false,
    });
  } catch (error) {
    console.warn('sendNotification error:', error);
  }
}
