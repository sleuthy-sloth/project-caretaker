import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

const config = {
  ...rawConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || rawConfig.apiKey,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIRESTORE_DATABASE_ID || rawConfig.firestoreDatabaseId,
};

const app = initializeApp(config);
export const db = getFirestore(app, config.firestoreDatabaseId);
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
