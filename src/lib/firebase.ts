import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function getFirebaseConfig() {
  // Required: VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID
  // Optional overrides: VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    const msg =
      'Firebase is not configured.\n\n' +
      '1. Go to https://console.firebase.google.com and create a project (or use an existing one).\n' +
      '2. Enable Google Authentication and Firestore Database in your project.\n' +
      '3. Create a web app in your project to get your Firebase config.\n' +
      '4. Copy the following into a .env file at the project root:\n\n' +
      '   VITE_FIREBASE_API_KEY=your-api-key\n' +
      '   VITE_FIREBASE_PROJECT_ID=your-project-id\n' +
      '   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com\n\n' +
      'See .env.example for all available options.';
    throw new Error(msg);
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

const config = getFirebaseConfig();
const app = initializeApp(config);
export const db = getFirestore(app);
export const auth = getAuth(app);

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  throw new FirestoreError(error, operationType, path);
}
