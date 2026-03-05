// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ⚠️ 請將這裡替換成你 Firebase 後台提供的真實設定值！
const firebaseConfig = {
  apiKey: "AIzaSyYourAPIKeyHere...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdefg..."
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化並導出 Firestore 資料庫實例 (這行最重要，絕對不能漏)
const db = getFirestore(app);
export { db };
