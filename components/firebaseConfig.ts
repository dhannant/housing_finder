// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: 'AIzaSyB8RgB7nOqyOd7T22gsDS1Cypv9OexV7i0',
  authDomain: 'leading-edge-realty-app.firebaseapp.com',
  projectId: 'leading-edge-realty-app',
  storageBucket: 'leading-edge-realty-app.appspot.com',
  messagingSenderId: '743617242604',
  appId: '1:743617242604:web:46756324a80c3781cfccc9',
//   measurementId: "G-WNYQL0V2MK"
};

// Entry-level: Only initialize the app if it hasn't been initialized yet
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const db = getFirestore(app);
export const auth = getAuth(app);
