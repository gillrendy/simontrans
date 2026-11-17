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

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// Google OAuth access token is cached strictly in memory (never localStorage/sessionStorage).
let cachedAccessToken: string | null = null;
let cachedEmail: string | null = null;

export interface GoogleAuthSession {
  user: User | null;
  email: string | null;
  hasToken: boolean;
}

export function getFirebaseAuthDiagnostics() {
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    projectId: firebaseConfig.projectId,
    oAuthClientId: firebaseConfig.oAuthClientId,
    hostname,
    origin,
    firebaseAuthSettingsUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`,
    gcpCredentialsUrl: `https://console.cloud.google.com/apis/credentials?project=${firebaseConfig.projectId}`,
  };
}

export function initGoogleAuth(
  onChange: (session: GoogleAuthSession) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user?.email) {
      cachedEmail = user.email;
    }
    if (!user && !cachedAccessToken) {
      cachedEmail = null;
    }
    onChange({
      user,
      email: user?.email ?? cachedEmail,
      hasToken: Boolean(cachedAccessToken),
    });
  });
}

function requestTokenViaGis(): Promise<string> {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2 || !firebaseConfig.oAuthClientId) {
      reject(
        new Error(
          'auth/unauthorized-domain: Google Identity Services belum termuat atau domain belum diotorisasi.'
        )
      );
      return;
    }

    const client = oauth2.initTokenClient({
      client_id: firebaseConfig.oAuthClientId,
      scope: SHEETS_SCOPE,
      prompt: 'consent',
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(
            new Error(
              resp.error_description ||
                resp.error ||
                'Gagal mendapatkan token akses Google Sheets.'
            )
          );
          return;
        }
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        reject(
          new Error(
            err.message ||
              `OAuth popup gagal (${err.type}). Pastikan domain diizinkan di GCP OAuth Client.`
          )
        );
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
}

export async function signInWithGoogleSheets(): Promise<{
  email: string | null;
  accessToken: string;
}> {
  const provider = new GoogleAuthProvider();
  provider.addScope(SHEETS_SCOPE);
  provider.setCustomParameters({ prompt: 'consent' });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error(
        'Token akses Google Sheets tidak diterima. Pastikan izin Google Sheets dicentang saat login.'
      );
    }

    cachedAccessToken = accessToken;
    cachedEmail = result.user.email ?? 'Akun Google Terhubung';
    return { email: cachedEmail, accessToken };
  } catch (err: unknown) {
    const errCode =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: string }).code)
        : '';
    const errMessage = err instanceof Error ? err.message : String(err);

    // If Firebase Auth rejects the host (auth/unauthorized-domain), try direct Google Identity Services token flow
    if (
      errCode === 'auth/unauthorized-domain' ||
      errMessage.includes('auth/unauthorized-domain')
    ) {
      try {
        const gisToken = await requestTokenViaGis();
        cachedAccessToken = gisToken;
        cachedEmail = 'Google Sheets OAuth Terhubung';
        return { email: cachedEmail, accessToken: gisToken };
      } catch (gisErr) {
        const host =
          typeof window !== 'undefined' ? window.location.hostname : '';
        const gisMsg = gisErr instanceof Error ? gisErr.message : '';
        throw new Error(
          `auth/unauthorized-domain: Domain "${host}" belum terdaftar di Firebase Authorized Domains atau GCP OAuth Client. ${gisMsg}`
        );
      }
    }

    throw err instanceof Error
      ? err
      : new Error('Gagal melakukan Sign in with Google.');
  }
}

export async function signOutGoogleSheets(): Promise<void> {
  cachedAccessToken = null;
  cachedEmail = null;
  try {
    await signOut(auth);
  } catch {
    // ignore if only GIS token was active
  }
}

export function getGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearGoogleAccessToken(): void {
  cachedAccessToken = null;
  cachedEmail = null;
}
