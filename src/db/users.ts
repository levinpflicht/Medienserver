import { getOrCreateUser as getOrCreateFirestoreUser } from "./firestoreService.ts";

export async function getOrCreateUser(uid: string, email: string) {
  try {
    return await getOrCreateFirestoreUser(uid, email);
  } catch (error) {
    console.error("Firestore user syncer failed:", error);
    throw new Error("Synchronisation des Benutzers in der Datenbank fehlgeschlagen.", { cause: error });
  }
}

