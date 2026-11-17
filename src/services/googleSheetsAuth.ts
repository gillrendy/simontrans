import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google OAuth access token is cached strictly in memory (never localStorage/sessionStorage).
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export interface GoogleAuthSession {
  user: User | null;
  hasToken: boolean;
}

export function initGoogleAuth(
  onChange: (session: GoogleAuthSession) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    cachedUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
    onChange({
      user,
      hasToken: Boolean(user && cachedAccessToken),
    });
  });
}

export async function signInWithGoogleSheets(): Promise<{
  user: User;
  accessToken: string;
}> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  provider.setCustomParameters({ prompt: 'consent' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error(
      'Token akses Google Sheets tidak diterima. Pastikan izin Google Sheets dicentang saat login.'
    );
  }

  cachedAccessToken = accessToken;
  cachedUser = result.user;
  return { user: result.user, accessToken };
}

export async function signOutGoogleSheets(): Promise<void> {
  cachedAccessToken = null;
  cachedUser = null;
  await signOut(auth);
}

export function getGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleAccessToken(): void {
  cachedAccessToken = null;
}

export function getSignedInGoogleUser(): User | null {
  return cachedUser ?? auth.currentUser;
}
