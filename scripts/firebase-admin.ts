/**
 * Firebase Admin SDK initializer for seed scripts.
 *
 * Credential resolution order:
 *   1. scripts/service-account.json   (download from Firebase Console → Project Settings → Service Accounts)
 *   2. GOOGLE_APPLICATION_CREDENTIALS env var  (Application Default Credentials)
 *   3. FIRESTORE_EMULATOR_HOST env var  (local emulator, no credentials needed)
 *
 * Project: fynd-app-42ef4
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const PROJECT_ID = 'fynd-app-42ef4';

function initAdmin(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  // 1. Service account key file alongside this script
  const saPath = path.join(__dirname, 'service-account.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: PROJECT_ID,
    });
  }

  // 2. GOOGLE_APPLICATION_CREDENTIALS (ADC)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    });
  }

  // 3. Local Firestore emulator (no key required)
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return admin.initializeApp({ projectId: PROJECT_ID });
  }

  throw new Error(
    '\n[Firebase Admin] No credentials found.\n\n' +
    'Options:\n' +
    '  1. Download a service account key from Firebase Console:\n' +
    '       Project Settings → Service Accounts → Generate new private key\n' +
    '     Save the file as: scripts/service-account.json\n\n' +
    '  2. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable:\n' +
    '       export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json\n\n' +
    '  3. Run the Firebase emulator and set FIRESTORE_EMULATOR_HOST=localhost:8080\n',
  );
}

const app = initAdmin();
export const db = admin.firestore(app);
export default app;
