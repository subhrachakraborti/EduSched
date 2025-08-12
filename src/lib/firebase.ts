
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB-JHXR018O7jalzlcVn1Aw05c0b7_tm34",
  authDomain: "edu-sched.firebaseapp.com",
  projectId: "edu-sched",
  storageBucket: "edu-sched.appspot.com",
  messagingSenderId: "1040315363683",
  appId: "1:1040315363683:web:f20f543bdeeb3dda61a356"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
