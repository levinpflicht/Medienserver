import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Define the 'users' table.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define the 'chats' table.
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionName: text("session_name").notNull(), // e.g. Diagnostic mode or session title
  createdAt: timestamp("created_at").defaultNow(),
});

// Define the 'messages' table.
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id")
    .references(() => chats.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // "user" | "model"
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define the 'api_logs' table for logging clinical/educational API requests.
export const apiLogs = pgTable("api_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  apiName: text("api_name").notNull(),
  endpoint: text("endpoint").notNull(),
  status: integer("status"),
  createdAt: timestamp("created_at").defaultNow(),
});

// EduLibrary: 'library_items' table for persistent offline storage of curated books, articles or audiobooks.
export const libraryItems = pgTable("library_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  itemType: text("item_type").notNull(), // "book" | "audiobook" | "article"
  title: text("title").notNull(),
  author: text("author"),
  description: text("description"),
  coverUrl: text("cover_url"),
  sourceUrl: text("source_url"),
  apiSource: text("api_source").notNull(), // "wikipedia" | "wikimedia" | "openlibrary" | "librivox"
  localContent: text("local_content"), // Full text / rich local description
  createdAt: timestamp("created_at").defaultNow(),
});

// EduLibrary: 'saved_quizzes' table for user-stored offline quiz questions from Open Trivia DB.
export const savedQuizzes = pgTable("saved_quizzes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  question: text("question").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  incorrectAnswers: text("incorrect_answers").notNull(), // JSON string or delimited
  createdAt: timestamp("created_at").defaultNow(),
});

// EduLibrary: 'quiz_scores' to save user metrics / highscores locally.
export const quizScores = pgTable("quiz_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  category: text("category").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  playedAt: timestamp("played_at").defaultNow(),
});

// Define relationships for the 'users' table.
export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  apiLogs: many(apiLogs),
  libraryItems: many(libraryItems),
  savedQuizzes: many(savedQuizzes),
  quizScores: many(quizScores),
}));

// Define relationships for the 'chats' table.
export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

// Define relationships for the 'messages' table.
export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

// Define relationships for the 'api_logs' table.
export const apiLogsRelations = relations(apiLogs, ({ one }) => ({
  user: one(users, {
    fields: [apiLogs.userId],
    references: [users.id],
  }),
}));

// Define relationships for the 'library_items' table.
export const libraryItemsRelations = relations(libraryItems, ({ one }) => ({
  user: one(users, {
    fields: [libraryItems.userId],
    references: [users.id],
  }),
}));

// Define relationships for the 'saved_quizzes' table.
export const savedQuizzesRelations = relations(savedQuizzes, ({ one }) => ({
  user: one(users, {
    fields: [savedQuizzes.userId],
    references: [users.id],
  }),
}));

// Define relationships for the 'quiz_scores' table.
export const quizScoresRelations = relations(quizScores, ({ one }) => ({
  user: one(users, {
    fields: [quizScores.userId],
    references: [users.id],
  }),
}));

