/** Public Firebase web config — safe for client and server routes. */
export const firebasePublicConfig = {
  apiKey: "AIzaSyBX4m9svLQljzTX4b5XJua641I0CD-3mfI",
  authDomain: "ac7-group.firebaseapp.com",
  projectId: "ac7-group",
  storageBucket: "ac7-group.firebasestorage.app",
  messagingSenderId: "536010122532",
  appId: "1:536010122532:web:2ca79efa6cda1d30c37fb1",
} as const;

export const FIREBASE_API_KEY = firebasePublicConfig.apiKey;
