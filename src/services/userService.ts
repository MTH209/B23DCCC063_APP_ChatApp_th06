import {
  ref,
  onValue,
  set,
  update,
  serverTimestamp,
  onDisconnect,
} from 'firebase/database';
import { database } from './firebase';
import { UserProfile } from '../types';

export type { UserProfile };

// Lắng nghe danh sách tất cả người dùng (loại trừ bản thân)
export function listenAllUsers(
  currentUid: string,
  callback: (users: UserProfile[]) => void,
): () => void {
  const usersRef = ref(database, 'users');
  return onValue(
    usersRef,
    snapshot => {
      const users: UserProfile[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          if (child.key !== currentUid) {
            const val = child.val();
            users.push({
              uid: child.key!,
              name: val.name || 'Người dùng',
              email: val.email || '',
              avatar: val.avatar || `https://i.pravatar.cc/150?u=${child.key}`,
              isOnline: Boolean(val.isOnline),
              lastSeen: val.lastSeen || 0,
            });
          }
        });
      }
      callback(users);
    },
    error => {
      console.warn('listenAllUsers error:', error?.message);
    },
  );
}

// Lắng nghe hồ sơ và trạng thái online của một người dùng cụ thể
export function listenUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
): () => void {
  const userRef = ref(database, `users/${uid}`);
  return onValue(
    userRef,
    snapshot => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        callback({
          uid,
          name: val.name || 'Người dùng',
          email: val.email || '',
          avatar: val.avatar || `https://i.pravatar.cc/150?u=${uid}`,
          isOnline: Boolean(val.isOnline),
          lastSeen: val.lastSeen || 0,
        });
      } else {
        callback(null);
      }
    },
    error => {
      console.warn('listenUserProfile error:', error?.message);
      callback(null);
    },
  );
}

// Cập nhật thông tin người dùng (Hồ sơ cá nhân: đổi họ tên, avatar)
export async function updateUserProfile(
  uid: string,
  data: { name?: string; avatar?: string },
): Promise<void> {
  try {
    const userRef = ref(database, `users/${uid}`);
    await update(userRef, data);
  } catch (error) {
    console.warn('updateUserProfile error:', error);
  }
}

// Hệ thống Presence: Tự động cập nhật offline khi mất kết nối mạng hoặc tắt app
export function setupPresenceSystem(uid: string): () => void {
  const connectedRef = ref(database, '.info/connected');
  const userStatusRef = ref(database, `users/${uid}/isOnline`);
  const userLastSeenRef = ref(database, `users/${uid}/lastSeen`);

  return onValue(
    connectedRef,
    snapshot => {
      if (snapshot.val() === true) {
        try {
          onDisconnect(userStatusRef).set(false).catch(() => {});
          onDisconnect(userLastSeenRef).set(serverTimestamp()).catch(() => {});

          set(userStatusRef, true).catch(() => {});
          set(userLastSeenRef, serverTimestamp()).catch(() => {});
        } catch (err: any) {
          console.warn('setupPresenceSystem error:', err?.message);
        }
      }
    },
    error => {
      console.warn('presence listener error:', error?.message);
    },
  );
}
