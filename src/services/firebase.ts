import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBrcRR7UZEZf-7R0QNqukBwzdfbviWoz0Y',
  authDomain: 'chat-app-d2a23.firebaseapp.com',
  databaseURL: 'https://chat-app-d2a23-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'chat-app-d2a23',
  storageBucket: 'chat-app-d2a23.firebasestorage.app',
  messagingSenderId: '666358934473',
  appId: '1:666358934473:web:c02a3cec0302a1b18cd618',
  measurementId: 'G-SVBMYR8X9Q',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const database = getDatabase(app);

export { app, auth, database, firebaseConfig };
