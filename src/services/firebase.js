import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyCYh0BO7fSO4JlmHwCK9_hUaRtVo44VNFA",
  authDomain: "nwatch-c3fd2.firebaseapp.com",
  projectId: "nwatch-c3fd2",
  storageBucket: "nwatch-c3fd2.firebasestorage.app",
  messagingSenderId: "803757270725",
  appId: "1:803757270725:web:233100f3d122c60ab972ac"
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export { auth, db, storage }