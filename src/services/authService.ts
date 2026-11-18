import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { ref, set, get, update, serverTimestamp } from 'firebase/database';
import { auth, database } from './firebase';

export async function registerUser(
  email: string,
  password: string,
  fullName: string,
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  try {
    await updateProfile(user, { displayName: fullName });
  } catch {
    // Không chặn tiến trình nếu updateProfile lỗi nhẹ
  }

  // Khởi tạo hồ sơ người dùng trong Realtime Database
  await set(ref(database, `users/${user.uid}`), {
    uid: user.uid,
    name: fullName,
    email: email,
    avatar: `https://i.pravatar.cc/150?u=${user.uid}`,
    isOnline: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return user;
}

export async function loginUser(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;
  const uid = user.uid;

  try {
    // Tự động đồng bộ profile vào Realtime Database nếu user tạo từ Firebase Console
    const userSnap = await get(ref(database, `users/${uid}`));
    if (!userSnap.exists()) {
      const fallbackName =
        user.displayName || email.split('@')[0] || 'Người dùng';
      await set(ref(database, `users/${uid}`), {
        uid: user.uid,
        name: fallbackName,
        email: email,
        avatar: `https://i.pravatar.cc/150?u=${user.uid}`,
        isOnline: true,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } else {
      await update(ref(database, `users/${uid}`), {
        isOnline: true,
        lastSeen: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('loginUser sync profile error:', error);
  }

  return userCredential;
}

export async function logoutUser(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await set(ref(database, `users/${user.uid}/isOnline`), false);
    await set(ref(database, `users/${user.uid}/lastSeen`), serverTimestamp());
  }
  await signOut(auth);
}

export function onAuthStateChanged(
  callback: (user: User | null) => void,
): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

