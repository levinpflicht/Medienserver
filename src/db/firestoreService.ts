import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firestore from Admin SDK
const db = getFirestore();

// Helper to generate positive integer IDs
function generateNumericId(): number {
  return Math.floor(10000000 + Math.random() * 90000000);
}

// User model persistence interface
export interface User {
  id: number;
  uid: string;
  email: string;
  createdAt: string;
}

export interface Chat {
  id: number;
  userId: number;
  sessionName: string;
  createdAt: string;
}

export interface Message {
  id: number;
  chatId: number;
  role: string;
  text: string;
  createdAt: string;
}

export interface ApiLog {
  id: number;
  userId: number | null;
  apiName: string;
  endpoint: string;
  status: number | null;
  createdAt: string;
}

export interface LibraryItem {
  id: number;
  userId: number;
  itemType: string;
  title: string;
  author: string | null;
  description: string | null;
  coverUrl: string | null;
  sourceUrl: string | null;
  apiSource: string;
  localContent: string | null;
  createdAt: string;
}

export interface SavedQuiz {
  id: number;
  userId: number;
  category: string;
  difficulty: string;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string; // JSON string or list
  createdAt: string;
}

export interface QuizScore {
  id: number;
  userId: number;
  category: string;
  score: number;
  totalQuestions: number;
  playedAt: string;
}

// Ensure user exists or create them
export async function getOrCreateUser(uid: string, email: string): Promise<User> {
  const usersRef = db.collection("users");
  const query = await usersRef.where("uid", "==", uid).limit(1).get();

  if (!query.empty) {
    const doc = query.docs[0];
    const data = doc.data();
    // Update email if it changed
    if (data.email !== email) {
      await doc.ref.update({ email });
    }
    return {
      id: data.id,
      uid: data.uid,
      email: email,
      createdAt: data.createdAt || new Date().toISOString()
    };
  }

  // Create new user
  const newId = generateNumericId();
  const createdAt = new Date().toISOString();
  const userData: User = {
    id: newId,
    uid,
    email,
    createdAt
  };

  await usersRef.doc(String(newId)).set(userData);
  return userData;
}

// Fetch user by Firebase UID
export async function getUserByUid(uid: string): Promise<User | null> {
  const query = await db.collection("users").where("uid", "==", uid).limit(1).get();
  if (query.empty) return null;
  return query.docs[0].data() as User;
}

// Fetch all chats of a user
export async function getChats(userId: number): Promise<Chat[]> {
  const snapshot = await db.collection("chats")
    .where("userId", "==", userId)
    .get();

  const chats: Chat[] = [];
  snapshot.forEach(doc => {
    chats.push(doc.data() as Chat);
  });

  // Sort by createdAt desc in memory
  return chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Create a new chat session
export async function createChat(userId: number, sessionName: string): Promise<Chat> {
  const newId = generateNumericId();
  const chatData: Chat = {
    id: newId,
    userId,
    sessionName,
    createdAt: new Date().toISOString()
  };

  await db.collection("chats").doc(String(newId)).set(chatData);
  return chatData;
}

// Delete a chat session and its inner messages
export async function deleteChat(chatId: number, userId: number): Promise<boolean> {
  const chatDocRef = db.collection("chats").doc(String(chatId));
  const chatDoc = await chatDocRef.get();

  if (!chatDoc.exists || chatDoc.data()?.userId !== userId) {
    return false;
  }

  // Delete chat messages
  const msgsSnapshot = await db.collection("messages")
    .where("chatId", "==", chatId)
    .get();

  const batch = db.batch();
  msgsSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  batch.delete(chatDocRef);
  await batch.commit();

  return true;
}

// Verify chat ownership and load it
export async function getChatById(chatId: number, userId: number): Promise<Chat | null> {
  const chatDoc = await db.collection("chats").doc(String(chatId)).get();
  if (!chatDoc.exists) return null;
  const data = chatDoc.data() as Chat;
  if (data.userId !== userId) return null;
  return data;
}

// Fetch all messages of a chat
export async function getMessages(chatId: number): Promise<Message[]> {
  const snapshot = await db.collection("messages")
    .where("chatId", "==", chatId)
    .get();

  const msgs: Message[] = [];
  snapshot.forEach(doc => {
    msgs.push(doc.data() as Message);
  });

  // Sort by createdAt asc
  return msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// Add a message to a chat
export async function createMessage(chatId: number, role: string, text: string): Promise<Message> {
  const newId = generateNumericId();
  const msgData: Message = {
    id: newId,
    chatId,
    role,
    text,
    createdAt: new Date().toISOString()
  };

  await db.collection("messages").doc(String(newId)).set(msgData);
  return msgData;
}

// Log external educational query telemetry
export async function createApiLog(userId: number | null, apiName: string, endpoint: string, status: number): Promise<ApiLog> {
  const newId = generateNumericId();
  const logData: ApiLog = {
    id: newId,
    userId,
    apiName,
    endpoint,
    status,
    createdAt: new Date().toISOString()
  };

  await db.collection("api_logs").doc(String(newId)).set(logData);
  return logData;
}

// Fetch recent API search logs
export async function getApiLogs(userId: number): Promise<ApiLog[]> {
  const snapshot = await db.collection("api_logs")
    .where("userId", "==", userId)
    .get();

  const logs: ApiLog[] = [];
  snapshot.forEach(doc => {
    logs.push(doc.data() as ApiLog);
  });

  return logs
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
}

// Library Items Offline CRUD
export async function createLibraryItem(
  userId: number,
  itemType: string,
  title: string,
  author: string,
  description: string,
  coverUrl: string,
  sourceUrl: string,
  apiSource: string,
  localContent: string
): Promise<LibraryItem> {
  const newId = generateNumericId();
  const itemData: LibraryItem = {
    id: newId,
    userId,
    itemType,
    title,
    author: author || "Unbekannt",
    description: description || "",
    coverUrl: coverUrl || "",
    sourceUrl: sourceUrl || "",
    apiSource,
    localContent: localContent || "",
    createdAt: new Date().toISOString()
  };

  await db.collection("library_items").doc(String(newId)).set(itemData);
  return itemData;
}

export async function getLibraryItems(userId: number): Promise<LibraryItem[]> {
  const snapshot = await db.collection("library_items")
    .where("userId", "==", userId)
    .get();

  const items: LibraryItem[] = [];
  snapshot.forEach(doc => {
    items.push(doc.data() as LibraryItem);
  });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteLibraryItem(itemId: number, userId: number): Promise<boolean> {
  const docRef = db.collection("library_items").doc(String(itemId));
  const docSnap = await docRef.get();

  if (!docSnap.exists || docSnap.data()?.userId !== userId) {
    return false;
  }

  await docRef.delete();
  return true;
}

// Offline Quiz DB CRUD
export async function createSavedQuiz(
  userId: number,
  category: string,
  difficulty: string,
  question: string,
  correctAnswer: string,
  incorrectAnswers: string
): Promise<SavedQuiz> {
  const newId = generateNumericId();
  const quizData: SavedQuiz = {
    id: newId,
    userId,
    category,
    difficulty,
    question,
    correctAnswer,
    incorrectAnswers,
    createdAt: new Date().toISOString()
  };

  await db.collection("saved_quizzes").doc(String(newId)).set(quizData);
  return quizData;
}

export async function getSavedQuizzes(userId: number): Promise<SavedQuiz[]> {
  const snapshot = await db.collection("saved_quizzes")
    .where("userId", "==", userId)
    .get();

  const quizzes: SavedQuiz[] = [];
  snapshot.forEach(doc => {
    quizzes.push(doc.data() as SavedQuiz);
  });

  return quizzes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteSavedQuiz(quizId: number, userId: number): Promise<boolean> {
  const docRef = db.collection("saved_quizzes").doc(String(quizId));
  const docSnap = await docRef.get();

  if (!docSnap.exists || docSnap.data()?.userId !== userId) {
    return false;
  }

  await docRef.delete();
  return true;
}

// high score trackers
export async function createQuizScore(
  userId: number,
  category: string,
  score: number,
  totalQuestions: number
): Promise<QuizScore> {
  const newId = generateNumericId();
  const scoreData: QuizScore = {
    id: newId,
    userId,
    category,
    score,
    totalQuestions: totalQuestions || 10,
    playedAt: new Date().toISOString()
  };

  await db.collection("quiz_scores").doc(String(newId)).set(scoreData);
  return scoreData;
}

export async function getQuizScores(userId: number): Promise<QuizScore[]> {
  const snapshot = await db.collection("quiz_scores")
    .where("userId", "==", userId)
    .get();

  const scores: QuizScore[] = [];
  snapshot.forEach(doc => {
    scores.push(doc.data() as QuizScore);
  });

  return scores.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
}
