
import * as admin from 'firebase-admin';

const serviceAccountKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!serviceAccountKey) {
    throw new Error('The FIREBASE_PRIVATE_KEY environment variable is not set.');
}
if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('The FIREBASE_CLIENT_EMAIL environment variable is not set.');
}

export const getFirebaseAdmin = async () => {
    if (admin.apps.length > 0) {
        return admin;
    }

    await admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: serviceAccountKey,
        }),
    });

    return admin;
};
