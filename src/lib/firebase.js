import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

// Public client config — safe to ship, access is governed by RTDB security rules
// (read-only for this app; see Firebase console "Rules" tab).
const firebaseConfig = {
  apiKey: 'AIzaSyCzZQsokcFNGpuI028sAssKeiq7wyekzV8',
  authDomain: 'simanewsite.firebaseapp.com',
  databaseURL: 'https://simanewsite-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'simanewsite',
  storageBucket: 'simanewsite.firebasestorage.app',
  messagingSenderId: '37803960645',
  appId: '1:37803960645:web:98ab18f4c0d27908bb362c',
  measurementId: 'G-89CWXTLRCY',
};

let app;
function getFirebaseApp() {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

/**
 * Subscribe to a Realtime Database path and get live updates.
 * Returns an unsubscribe function.
 */
export function watchPath(path, onData, onError) {
  const db = getDatabase(getFirebaseApp());
  const dbRef = ref(db, path);
  return onValue(
    dbRef,
    (snapshot) => onData(snapshot.val(), snapshot.exists()),
    (error) => onError && onError(error)
  );
}
