import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

function getFirebaseConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
} | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    return null;
  }

  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;

export const firebaseInitError: string | null = (() => {
  const config = getFirebaseConfig();
  if (!config) {
    return (
      'Firebase is not configured.\n\n' +
      '1. Go to https://console.firebase.google.com and create a project (or use an existing one).\n' +
      '2. Enable Google Authentication and Firestore Database in your project.\n' +
      '3. Create a web app in your project to get your Firebase config.\n' +
      '4. Copy the following into a .env file at the project root:\n\n' +
      '   VITE_FIREBASE_API_KEY=your-api-key\n' +
      '   VITE_FIREBASE_PROJECT_ID=your-project-id\n' +
      '   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com\n\n' +
      'See .env.example for all available options.'
    );
  }
  try {
    _app = initializeApp(config);
    _db = getFirestore(_app);
    _auth = getAuth(_app);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
})();

export const db = _db!;
export const auth = _auth!;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export class FirestoreError extends Error {
  public operationType: OperationType;
  public path: string | null;
  public authInfo: FirestoreErrorInfo['authInfo'];
  public originalError: unknown;

  constructor(error: unknown, operationType: OperationType, path: string | null) {
    const message = error instanceof Error ? error.message : String(error);
    super(message);
    this.name = 'FirestoreError';
    this.operationType = operationType;
    this.path = path;
    this.originalError = error;
    this.authInfo = {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    };

    const errInfo: FirestoreErrorInfo = {
      error: message,
      authInfo: this.authInfo,
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  // FirestoreError constructor already logs the error; don't throw to avoid
  // unmounting the component tree from onSnapshot error callbacks.
  new FirestoreError(error, operationType, path);
}
