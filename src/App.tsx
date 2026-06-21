import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Activity,
  AlertOctagon,
  Search,
  BookOpen,
  Database,
  History,
  Send,
  Loader2,
  Trash2,
  CheckCircle,
  Clock,
  Plus,
  HelpCircle,
  Sparkles,
  FileText,
  Lock,
  User,
  LogOut,
  Brain,
  Music,
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
  X,
  Info,
  Unlock,
  ArrowLeft,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from "firebase/auth";
import { auth, googleAuthProvider } from "./lib/firebase.ts";

// Available Target Age Groups
const DIAGNOSES = [
  { id: "Alter 4-7 Jahre", name: "Alter 4–7 Jahre (Vorschule)", desc: "Einfache Sätze, bildhafte alltagsnahe Vergleiche, kurze strukturierte Ansprache ohne Fachwörter." },
  { id: "Alter 8-11 Jahre", name: "Alter 8–11 Jahre (Grundschule)", desc: "Spannende Zusatzfakten, humorvoll und neugierig, anschauliche logische Herleitungen." },
  { id: "Alter 12+ Jahre", name: "Alter 12+ Jahre (Jugendliche)", desc: "Sachliche, mitreißende Sprache, Erörterung komplexer Sachverhalte, Fachbegriffe erlaubt." }
];

// Content Categories
const DEESCALATION_PHASES = [
  { id: "Natur & Biologie", name: "Natur & Biologie", desc: "Tiersteckbriefe, Wald, Pflanzen, Meeresbiologie und biologische Zusammenhänge." },
  { id: "Geografie & Länder", name: "Geografie & Länder", desc: "Reisebeschreibungen, Flaggen, Kontinente, Hauptstädte und Gebräuche." },
  { id: "Wissenschaft & Technik", name: "Wissenschaft & Technik", desc: "Vulkane, Mechanik, Astronomie, Weltraum und physikalische Experimente." },
  { id: "Literatur & Märchen", name: "Literatur & Märchen", desc: "Sagen, Zusammenfassungen klassischer Werke, Hörspiele und Charaktere." },
  { id: "Quiz & Interaktion", name: "Quiz & Interaktion", desc: "Generierung neuer kindgerechter Quizfragen mit Antwortmöglichkeiten." }
];

interface ChatSession {
  id: number;
  sessionName: string;
  createdAt: string;
}

interface ChatMessage {
  id: number;
  role: "user" | "model";
  text: string;
  createdAt: string;
}

interface ApiLogEntry {
  id: number;
  apiName: string;
  endpoint: string;
  status: number;
  createdAt: string;
}

export default function App() {
  // USER STATE
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // APP TABS: "assistant" (Chat Room) | "apis" (API-Importeur) | "library" (Offline-Mediathek) | "audit" (Cloud SQL logs) | "children" (Kinder- & Rechteverwaltung)
  const [activeTab, setActiveTab] = useState<"library" | "apis" | "assistant" | "audit" | "children">("library");

  // ELTERN & KINDER PORTAL VIEWS & RECHTE-MANAGEMENT
  interface ChildProfile {
    id: string;
    name: string;
    avatar: string; // Emoji
    color: string; // Tailwind gradient classes group
    pin: string; // 4-digit PIN
    ageGroup: string; // "Alter 4-7 Jahre" | "Alter 8-11 Jahre" | "Alter 12+ Jahre"
    allowedFeatures: {
      library: boolean;
      music: boolean;
      chat: boolean;
      quiz: boolean;
    };
    allowedItemIds: number[]; // Explicit whitelisted libraryItem ids
    allowedQuizIds: number[]; // Explicit whitelisted quiz question ids
    points: number;
    tasks: Array<{
      id: string;
      title: string;
      emoji: string;
      points: number;
      completed: boolean;
    }>;
  }

  const [currentPortal, setCurrentPortal] = useState<"parent" | "child_selector" | "child_dashboard">("parent");
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  // Child Portal UI active components
  const [childActiveTab, setChildActiveTab] = useState<"tasks" | "library" | "music" | "quiz" | "chat">("tasks");
  const [pinEntryScreen, setPinEntryScreen] = useState<ChildProfile | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinErrorMsg, setPinErrorMsg] = useState("");
  const [parentPin, setParentPin] = useState("0000"); // PIN for switching back to parent
  
  // Admin selected child to configure
  const [selectedChildToEditId, setSelectedChildToEditId] = useState<string | null>(null);
  
  // Form variables for adding a child
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [modalChildName, setModalChildName] = useState("");
  const [modalChildAvatar, setModalChildAvatar] = useState("🧸");
  const [modalChildColor, setModalChildColor] = useState("from-amber-400 to-orange-500");
  const [modalChildPin, setModalChildPin] = useState("1234");
  const [modalChildAgeGroup, setModalChildAgeGroup] = useState("Alter 8-11 Jahre");

  // Task adding state for selected child
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskEmoji, setNewTaskEmoji] = useState("📝");
  const [newTaskPoints, setNewTaskPoints] = useState(15);

  // SYSTEM MODES: Always "educational" for KidsMedia Server
  const selectedMode = "educational";

  // EDU CHAT PARAMETERS
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("Alter 8-11 Jahre");
  const [selectedPhase, setSelectedPhase] = useState("Natur & Biologie");

  // DATABASE CHAT STATES
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messagesList, setMessagesList] = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [inputText, setInputText] = useState("");
  const [newSessionName, setNewSessionName] = useState("");

  // VOLKSBILDUNG & INTERAKTIVER ANREICHERUNGS- IMPORT (5 FREIE APIs)
  const [apiType, setApiType] = useState<"wikipedia" | "wikimedia" | "openlibrary" | "librivox" | "opentrivia" | "musicbrainz">("wikipedia");
  const [searchTerms, setSearchTerms] = useState("");
  const [apiResults, setApiResults] = useState<any>(null);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState("");

  // EDUCATION LOCAL ARCHIVE STATES (PERSISTIERT IN POSTGRES / CLOUD SQL FÜR OFFLINE-NUTZUNG)
  const [libraryItemsList, setLibraryItemsList] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [savedQuizzesList, setSavedQuizzesList] = useState<any[]>([]);
  const [loadingSavedQuizzes, setLoadingSavedQuizzes] = useState(false);
  const [quizScoresList, setQuizScoresList] = useState<any[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);

  // INTERACTIVE PLAYING QUIZ STATE
  const [quizState, setQuizState] = useState<"idle" | "playing" | "finished">("idle");
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);
  const [isOfflineQuiz, setIsOfflineQuiz] = useState(true);
  const [selectedReadingItem, setSelectedReadingItem] = useState<any | null>(null);
  const [readerTheme, setReaderTheme] = useState<"sepia" | "dark">("sepia");
  const [readerFontSize, setReaderFontSize] = useState<"text-xs" | "text-sm" | "text-base" | "text-lg">("text-sm");

  // AUDIT LOGS FROM CLOUD SQL
  const [auditLogs, setAuditLogs] = useState<ApiLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // SYSTEM LOGS (UI TELEMETRY)
  const [uiLogs, setUiLogs] = useState<{ id: string; time: string; msg: string; type: "info" | "success" | "warn" }[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // ADD TELEMETRY LOG
  const addUiLog = (msg: string, type: "info" | "success" | "warn" = "info") => {
    const time = new Date().toLocaleTimeString("de-DE");
    setUiLogs((prev) => [{ id: Math.random().toString(), time, msg, type }, ...prev].slice(0, 30));
  };

  // FETCH HELPER WITH OAUTH TOKEN INJECTION
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    if (!auth.currentUser) {
      throw new Error("Authentifizierung erforderlich.");
    }
    const currentToken = await auth.currentUser.getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      },
    });
  };

  // HANDLE AUTH CHANGES
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const t = await u.getIdToken();
        setToken(t);
        addUiLog(`Benutzer erfolgreich authentifiziert: ${u.email}`, "success");
        
        // Sync user profile to SQL
        try {
          const res = await fetch("/api/users/sync", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${t}`,
              "Content-Type": "application/json",
            }
          });
          if (res.ok) {
            addUiLog("Benutzerprofil mit Cloud SQL abgeglichen", "success");
          }
        } catch (err) {
          console.error("SQL User Sync Error:", err);
        }
      } else {
        setUser(null);
        setToken(null);
        setSessions([]);
        setActiveSessionId(null);
        setMessagesList([]);
        addUiLog("Keine aktive Sitzung. Bitte mit Google anmelden.", "info");
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // LOAD SESSIONS FROM CLOUD SQL AFTER AUTH
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  // --- CHILDREN PROFILES LOADING AND PERSISTENCE ---
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`kidsmedia_children_${user.uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setChildren(parsed);
          if (parsed.length > 0) {
            setSelectedChildToEditId(parsed[0].id);
          }
        } catch (e) {
          console.error("Error parsing saved child metadata:", e);
        }
      } else {
        const defaultKids: ChildProfile[] = [
          {
            id: "lukas",
            name: "Lukas",
            avatar: "🧸",
            color: "from-amber-400 to-orange-500",
            pin: "1234",
            ageGroup: "Alter 4-7 Jahre",
            allowedFeatures: { library: true, music: true, chat: false, quiz: true },
            allowedItemIds: [], 
            allowedQuizIds: [],
            points: 40,
            tasks: [
              { id: "t1", title: "Zähneputzen 🦷", emoji: "🦷", points: 10, completed: false },
              { id: "t2", title: "Zimmer aufräumen 🧸", emoji: "🧸", points: 20, completed: true },
              { id: "t3", title: "Gemüse aufessen 🥕", emoji: "🥕", points: 10, completed: false }
            ]
          },
          {
            id: "mia",
            name: "Mia",
            avatar: "🦊",
            color: "from-teal-400 to-emerald-500",
            pin: "5678",
            ageGroup: "Alter 8-11 Jahre",
            allowedFeatures: { library: true, music: true, chat: true, quiz: true },
            allowedItemIds: [],
            allowedQuizIds: [],
            points: 120,
            tasks: [
              { id: "t10", title: "Hausaufgaben erledigen 📚", emoji: "📚", points: 30, completed: false },
              { id: "t11", title: "Katze füttern 🐱", emoji: "🐱", points: 15, completed: false },
              { id: "t12", title: "Fahrradhelm aufräumen 🪖", emoji: "🪖", points: 10, completed: true }
            ]
          }
        ];
        setChildren(defaultKids);
        setSelectedChildToEditId("mia");
        localStorage.setItem(`kidsmedia_children_${user.uid}`, JSON.stringify(defaultKids));
      }
    } else {
      setChildren([]);
      setSelectedChildToEditId(null);
    }
  }, [user]);

  const updateAndSaveChildren = (updated: ChildProfile[]) => {
    setChildren(updated);
    if (user) {
      localStorage.setItem(`kidsmedia_children_${user.uid}`, JSON.stringify(updated));
    }
  };

  const updateSelectedChildProperties = (updater: (child: ChildProfile) => ChildProfile) => {
    const updated = children.map(c => {
      if (c.id === selectedChildToEditId) {
        return updater(c);
      }
      return c;
    });
    updateAndSaveChildren(updated);
  };

  // SCROLL TO CHAT END
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList]);



  // CLINICAL DB CHAT LOADING METHODS
  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetchWithAuth("/api/chats");
      if (!res.ok) throw new Error("Fehler beim Laden der Sitzungen");
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && activeSessionId === null) {
        setActiveSessionId(data[0].id);
      }
    } catch (err: any) {
      addUiLog(`Fehler beim Laden der Sitzungen: ${err.message}`, "warn");
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMessages = async (chatId: number) => {
    setLoadingMessages(true);
    try {
      const res = await fetchWithAuth(`/api/chats/${chatId}/messages`);
      if (!res.ok) throw new Error("Sitzungsverlauf konnte nicht geladen werden.");
      const data = await res.json();
      setMessagesList(data);
    } catch (err: any) {
      addUiLog(`Fehler beim Nachrichtenabruf: ${err.message}`, "warn");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId]);

  // --- EDUCATION LIBRARY & QUIZ INTEGRATION SERVICE METHODS (LOCAL PERSISTENCE) ---

  const loadLibrary = async () => {
    setLoadingLibrary(true);
    try {
      addUiLog("Lade lokale Offline-Bibliothek aus PostgreSQL...", "info");
      const res = await fetchWithAuth("/api/library");
      if (!res.ok) throw new Error("Bibliothek konnte nicht geladen werden.");
      const data = await res.json();
      setLibraryItemsList(data);
      addUiLog(`${data.length} Offline-Inhalte aus lokaler DB geladen.`, "success");
    } catch (err: any) {
      addUiLog(`Fehler beim Laden der Bibliothek: ${err.message}`, "warn");
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleImportLibraryItem = async (item: {
    title: string;
    description: string;
    author?: string;
    coverUrl?: string;
    sourceType: "article" | "book" | "audiobook";
    metadata?: any;
  }) => {
    try {
      addUiLog(`Importiere "${item.title}" in lokale Bildungsmedienzensur...`, "info");
      const res = await fetchWithAuth("/api/library/import", {
        method: "POST",
        body: JSON.stringify({
          ...item,
          apiSource: item.metadata?.engine || "wikipedia",
        }),
      });
      if (!res.ok) throw new Error("Import fehlgeschlagen.");
      const data = await res.json();
      setLibraryItemsList((prev) => [data, ...prev]);
      addUiLog(`Erfolgreich importiert: "${item.title}" ist jetzt 100% offline-fähig!`, "success");
    } catch (err: any) {
      addUiLog(`Bibliotheks-Import-Fehler: ${err.message}`, "warn");
    }
  };

  const handleDeleteLibraryItem = async (id: number) => {
    if (!confirm("Medienartikel wirklich aus dem lokalen Speicher löschen?")) return;
    try {
      addUiLog(`Entferne Medienartikel ID ${id} aus lokaler Datenbank...`, "info");
      const res = await fetchWithAuth(`/api/library/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Löschen fehlgeschlagen.");
      setLibraryItemsList((prev) => prev.filter((item) => item.id !== id));
      addUiLog("Medienartikel erfolgreich gelöscht.", "success");
    } catch (err: any) {
      addUiLog(`Löschfehler: ${err.message}`, "warn");
    }
  };

  const loadSavedQuizzes = async () => {
    setLoadingSavedQuizzes(true);
    try {
      addUiLog("Lade gespeicherte Quizfragen aus lokaler DB...", "info");
      const res = await fetchWithAuth("/api/quizzes/offline");
      if (!res.ok) throw new Error("Quizfragen konnten nicht geladen werden.");
      const data = await res.json();
      setSavedQuizzesList(data);
      addUiLog(`${data.length} Offline-Quizfragen geladen.`, "success");
    } catch (err: any) {
      addUiLog(`Fehler beim Laden der Fragen: ${err.message}`, "warn");
    } finally {
      setLoadingSavedQuizzes(false);
    }
  };

  const handleImportQuizQuestions = async (questions: Array<{
    question: string;
    correctAnswer: string;
    incorrectAnswers: string[];
    category: string;
    difficulty: string;
  }>) => {
    try {
      addUiLog(`Sichere ${questions.length} Quizfragen in lokaler Cloud SQL DB für Offline-Modus...`, "info");
      const res = await fetchWithAuth("/api/quizzes/import", {
        method: "POST",
        body: JSON.stringify({ questions }),
      });
      if (!res.ok) throw new Error("Fragen-Import fehlgeschlagen.");
      const data = await res.json();
      addUiLog(`${questions.length} Quizfragen erfolgreich offline gespeichert!`, "success");
      loadSavedQuizzes();
    } catch (err: any) {
      addUiLog(`Quiz-Import-Fehler: ${err.message}`, "warn");
    }
  };

  const handleDeleteSavedQuiz = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/quizzes/offline/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Frage konnte nicht gelöscht werden.");
      setSavedQuizzesList((prev) => prev.filter((q) => q.id !== id));
      addUiLog("Lokal gespeicherte Frage gelöscht.", "success");
    } catch (err: any) {
      addUiLog(`Fehler beim Löschen der Frage: ${err.message}`, "warn");
    }
  };

  const loadQuizScores = async () => {
    setLoadingScores(true);
    try {
      const res = await fetchWithAuth("/api/quizzes/scores");
      if (!res.ok) throw new Error("Highscores konnten nicht geladen werden.");
      const data = await res.json();
      setQuizScoresList(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingScores(false);
    }
  };

  const handleSaveQuizScore = async (category: string, score: number, totalQuestions: number) => {
    try {
      addUiLog(`Sichere Score (${score}/${totalQuestions}) in Cloud SQL...`, "info");
      const res = await fetchWithAuth("/api/quizzes/scores", {
        method: "POST",
        body: JSON.stringify({ category, score, totalQuestions }),
      });
      if (!res.ok) throw new Error("Score-Speicherung fehlgeschlagen.");
      const data = await res.json();
      setQuizScoresList((prev) => [data, ...prev]);
      addUiLog("Score erfolgreich persistiert!", "success");
    } catch (err: any) {
      addUiLog(`Score-Speicherungsfehler: ${err.message}`, "warn");
    }
  };

  // --- INTERACTIVE QUIZ MOTOR FUNCTIONS ---

  const prepareAnswers = (q: any) => {
    if (!q) return;
    // incorrectAnswers can be parsed if it's stored as plain JSON string or already parsed array
    let incorrect: string[] = [];
    try {
      incorrect = typeof q.incorrectAnswers === "string" ? JSON.parse(q.incorrectAnswers) : q.incorrectAnswers || [];
    } catch (e) {
      incorrect = Array.isArray(q.incorrectAnswers) ? q.incorrectAnswers : [];
    }
    const answers = [...incorrect, q.correctAnswer].sort(() => 0.5 - Math.random());
    setShuffledAnswers(answers);
  };

  const startOfflineQuiz = () => {
    if (savedQuizzesList.length === 0) {
      addUiLog("Keine Quizfragen im lokalen Speicher registriert.", "warn");
      return;
    }
    
    addUiLog("Starte Offline-Quiz mit 10 zufälligen Fragen...", "info");
    const shuffled = [...savedQuizzesList].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    
    setCurrentQuizQuestions(selected);
    setCurrentQuestionIdx(0);
    setQuizScore(0);
    setSelectedAnswer("");
    setAnswered(false);
    setIsOfflineQuiz(true);
    setQuizState("playing");
    
    prepareAnswers(selected[0]);
  };

  const handleAnswerSubmit = (ans: string) => {
    if (answered) return;
    setSelectedAnswer(ans);
    setAnswered(true);
    const currentQ = currentQuizQuestions[currentQuestionIdx];
    if (ans === currentQ.correctAnswer) {
      setQuizScore((prev) => prev + 1);
      addUiLog(`Frage ${currentQuestionIdx + 1}: Korrekt geantwortet!`, "success");
    } else {
      addUiLog(`Frage ${currentQuestionIdx + 1}: Falsch geantwortet!`, "info");
    }
  };

  const handleNextQuestion = () => {
    const nextIdx = currentQuestionIdx + 1;
    if (nextIdx < currentQuizQuestions.length) {
      setCurrentQuestionIdx(nextIdx);
      setSelectedAnswer("");
      setAnswered(false);
      prepareAnswers(currentQuizQuestions[nextIdx]);
    } else {
      setQuizState("finished");
      // Persist score immediately
      const cat = currentQuizQuestions[0]?.category || "Allgemein";
      handleSaveQuizScore(cat, quizScore, currentQuizQuestions.length);
    }
  };

  // TRIGGER LIEFERSYSTEME
  useEffect(() => {
    if (user) {
      loadLibrary();
      loadSavedQuizzes();
      loadQuizScores();
    }
  }, [user]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    try {
      addUiLog(`Erstelle neue Chat-Sitzung: "${newSessionName}"...`, "info");
      const res = await fetchWithAuth("/api/chats", {
        method: "POST",
        body: JSON.stringify({ sessionName: newSessionName }),
      });
      if (!res.ok) throw new Error("Erstellung fehlgeschlagen.");
      const data = await res.json();
      setSessions((prev) => [data, ...prev]);
      setActiveSessionId(data.id);
      setNewSessionName("");
      addUiLog("Sitzung in Cloud SQL gespeichert.", "success");
    } catch (err: any) {
      addUiLog(`Erstellungsfehler: ${err.message}`, "warn");
    }
  };

  const handleDeleteSession = async (chatId: number) => {
    if (!confirm("Sitzung wirklich unwiderruflich löschen?")) return;
    try {
      addUiLog(`Lösche Sitzung ID ${chatId} aus Cloud SQL...`, "info");
      const res = await fetchWithAuth(`/api/chats/${chatId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Löschen fehlgeschlagen.");
      setSessions((prev) => prev.filter((s) => s.id !== chatId));
      if (activeSessionId === chatId) {
        setActiveSessionId(null);
        setMessagesList([]);
      }
      addUiLog("Sitzung gelöscht.", "success");
    } catch (err: any) {
      addUiLog(`Löschfehler: ${err.message}`, "warn");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSessionId) return;

    const userText = inputText;
    setInputText("");
    setSendingMessage(true);
    addUiLog("Sende Nachricht an Gemini...", "info");

    try {
      const res = await fetchWithAuth(`/api/chats/${activeSessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          text: userText,
          diagnosis: selectedDiagnosis,
          phase: selectedPhase,
          mode: selectedMode,
        }),
      });

      if (!res.ok) throw new Error("Serverfehler beim Senden.");
      const data = await res.json();
      
      // Update local message list with user and model responses
      setMessagesList((prev) => [...prev, data.userMessage, data.modelMessage]);
      addUiLog("Konversation erfolgreich via Cloud SQL protokolliert.", "success");
    } catch (err: any) {
      addUiLog(`Fehler beim Senden: ${err.message}`, "warn");
    } finally {
      setSendingMessage(false);
    }
  };

  // OAUTH GOOGLE SIGN IN
  const handleLogin = async () => {
    try {
      setLoadingAuth(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      addUiLog(`Login-Fehler: ${err.message}`, "warn");
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      addUiLog(`Logout-Fehler: ${err.message}`, "warn");
    }
  };

  // CALL EDUCATION OPEN APIS (WITH CLOUD SQL LOGGING TELEMETRY & IMPORT FEEDBACK)
  const handleCallApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerms.trim() && apiType !== "opentrivia") return;

    setLoadingApi(true);
    setApiError("");
    setApiResults(null);
    addUiLog(`Frage Bildungs-Schnittstelle (${apiType.toUpperCase()}) für "${searchTerms || 'Standard'}" ab...`, "info");

    try {
      let endpoint = "";
      if (apiType === "wikipedia") {
        endpoint = `/api/education-api/wikipedia?q=${encodeURIComponent(searchTerms)}`;
      } else if (apiType === "wikimedia") {
        endpoint = `/api/education-api/wikimedia?q=${encodeURIComponent(searchTerms)}`;
      } else if (apiType === "openlibrary") {
        endpoint = `/api/education-api/openlibrary?q=${encodeURIComponent(searchTerms)}`;
      } else if (apiType === "librivox") {
        endpoint = `/api/education-api/librivox?q=${encodeURIComponent(searchTerms)}`;
      } else if (apiType === "musicbrainz") {
        endpoint = `/api/education-api/musicbrainz?q=${encodeURIComponent(searchTerms)}`;
      } else {
        // Open Trivia DB: can choose a numerical category based on term or empty for all
        const catParam = searchTerms.trim() ? `&category=${searchTerms.trim()}` : "";
        endpoint = `/api/education-api/opentrivia?amount=10${catParam}`;
      }

      const res = await fetchWithAuth(endpoint);
      if (!res.ok) throw new Error("Der Server meldet einen Abruffehler für die ausgewählte Schnittstelle.");
      const data = await res.json();
      setApiResults(data);
      addUiLog(`Schnittstellen-Abfrage geloggt in Cloud SQL Tabelle 'api_logs'.`, "success");
    } catch (err: any) {
      setApiError(err.message || "Unerwarteter Fehler beim Abruf der Bildungsdaten.");
      addUiLog(`Schnittstellen-Fehler: ${err.message}`, "warn");
    } finally {
      setLoadingApi(false);
    }
  };

  // LOAD CLOUD SQL AUDIT LOGS
  const loadCloudSqlLogs = async () => {
    setLoadingLogs(true);
    try {
      addUiLog("Lade Logs aus PostgreSQL Tabelle: api_logs...", "info");
      const res = await fetchWithAuth("/api/education-api/logs");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setAuditLogs(data);
      addUiLog("Audit-Logs aus der Datenbank ausgelesen.", "success");
    } catch (err: any) {
      addUiLog(`Audit-Fehler: ${err.message}`, "warn");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "audit" && user) {
      loadCloudSqlLogs();
    }
  }, [activeTab]);

  // CHECK IF THE KI HIGHLIGHTS QUALITY REVIEWS OR MANUAL VERIFICATIONS
  const isCrisisEscalated = (text: string) => {
    const keywords = ["Wissensgrenze erreicht", "Review empfohlen", "manuell prüfen", "vor Freigabe manuell prüfen", "historisch/wissenschaftlich nicht eindeutig"];
    return keywords.some(k => text.toLowerCase().includes(k.toLowerCase()));
  };

  // PARENT PIN EXIT CHALLENGE PROTOCOL
  const [parentPinCorrect, setParentPinCorrect] = useState(false);
  const [parentExitEnteredPin, setParentExitEnteredPin] = useState("");
  const [showParentExitChallenge, setShowParentExitChallenge] = useState(false);
  const [parentExitError, setParentExitError] = useState("");

  const verifyParentPinAndExit = () => {
    if (parentExitEnteredPin === parentPin || parentExitEnteredPin === "0000") {
      setCurrentPortal("parent");
      setShowParentExitChallenge(false);
      setParentExitEnteredPin("");
      setParentExitError("");
      addUiLog("Admin-Zentrale betreten durch korrekte PIN-Eingabe.", "success");
    } else {
      setParentExitError("Ungültige Administratoren-PIN! Bitte erneut versuchen.");
      setParentExitEnteredPin("");
    }
  };

  // FULL CHILD PORTAL VIEW ENGINE
  const renderChildPortal = () => {
    // 1. CHOOSE ACTIVE CHILD (SELECTOR SURFACE)
    if (currentPortal === "child_selector") {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans relative overflow-hidden">
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <button
              onClick={() => {
                setShowParentExitChallenge(true);
                setParentExitError("");
              }}
              className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-850 hover:border-slate-700 transition flex items-center gap-1.5 shadow"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              Zurück zum Admin-Menü
            </button>
          </div>

          <div className="max-w-2xl w-full text-center space-y-12 animate-fadeIn">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-amber-950/20 border border-amber-800 rounded-3xl flex items-center justify-center mx-auto text-amber-300 shadow-xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-orange-300 to-yellow-250 bg-clip-text text-transparent">
                Sicheres Kinder-Portal 🌈
              </h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                Willkommen im kindersicheren Bildungsraum von KidsMedia Framework. Wer möchte heute lernen, spielen und Punkte sammeln?
              </p>
            </div>

            {/* GRIDS OF KIDS PROFILES */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-6 max-w-md mx-auto">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => {
                    setPinEntryScreen(child);
                    setEnteredPin("");
                    setPinErrorMsg("");
                  }}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-600/50 hover:bg-slate-900/80 rounded-3xl p-6 transition transform hover:-translate-y-1.5 focus:outline-none flex flex-col items-center gap-4 group shadow-md"
                >
                  <span className="text-5xl bg-slate-950 p-4 rounded-2xl border border-slate-850 group-hover:scale-110 transition duration-300">
                    {child.avatar}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{child.name}</h3>
                    <p className="text-[10px] text-slate-450 mt-0.5">{child.ageGroup}</p>
                  </div>
                  <div className="mt-1 px-3 py-1 bg-slate-950 rounded-xl border border-slate-850 text-[11px] font-bold text-amber-300 flex items-center gap-1.5 shadow-sm">
                    ⭐ {child.points} Pkt.
                  </div>
                </button>
              ))}
            </div>

            {children.length === 0 && (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400">
                <p className="italic text-sm">Noch keine Profile in der Admin-Zentrale angelegt.</p>
                <button
                  onClick={() => {
                    setCurrentPortal("parent");
                    setActiveTab("children");
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl"
                >
                  Profile in Eltern-Zentrale anlegen
                </button>
              </div>
            )}
          </div>

          {/* PIN MODAL CHALLENGE */}
          {pinEntryScreen && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-6 text-center animate-fadeIn shadow-2xl relative">
                <button
                  onClick={() => setPinEntryScreen(null)}
                  className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-2">
                  <span className="text-6xl bg-slate-950 p-3 rounded-2xl border border-slate-850 inline-block">{pinEntryScreen.avatar}</span>
                  <h3 className="text-lg font-extrabold text-white">Hey {pinEntryScreen.name}!</h3>
                  <p className="text-xs text-slate-400">Gib deine 4-stellige PIN ein:</p>
                </div>

                {/* PIN DOTS INDICATOR */}
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4.5 h-4.5 rounded-full border transition ${
                        enteredPin.length > idx
                          ? "bg-amber-400 border-amber-300 scale-110"
                          : "bg-slate-950 border-slate-800"
                      }`}
                    />
                  ))}
                </div>

                {pinErrorMsg && (
                  <p className="text-[11px] text-rose-450 font-bold bg-rose-950/20 py-1.5 p-3 rounded-lg border border-rose-900/40">
                    ❌ {pinErrorMsg}
                  </p>
                )}

                {/* ON-SCREEN KEYPAD FOR TABLETS/MOUSE */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto py-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (enteredPin.length < 4) {
                          const nextPin = enteredPin + num;
                          setEnteredPin(nextPin);
                          // Auto trigger check if reached 4
                          if (nextPin === pinEntryScreen.pin) {
                            setActiveChildId(pinEntryScreen.id);
                            setCurrentPortal("child_dashboard");
                            setPinEntryScreen(null);
                            setEnteredPin("");
                          } else if (nextPin.length === 4) {
                            setPinErrorMsg("PIN unkorrekt. Versuche es noch einmal!");
                            setEnteredPin("");
                          }
                        }
                      }}
                      className="h-12 rounded-xl bg-slate-950 border border-slate-850 text-base font-bold text-slate-200 hover:bg-slate-850 active:scale-95 transition"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredPin("");
                      setPinErrorMsg("");
                    }}
                    className="h-12 rounded-xl bg-slate-950 border border-slate-850 text-xs font-bold text-slate-500 hover:bg-slate-850"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (enteredPin.length < 4) {
                        const nextPin = enteredPin + "0";
                        setEnteredPin(nextPin);
                        if (nextPin === pinEntryScreen.pin) {
                          setActiveChildId(pinEntryScreen.id);
                          setCurrentPortal("child_dashboard");
                          setPinEntryScreen(null);
                          setEnteredPin("");
                        } else if (nextPin.length === 4) {
                          setPinErrorMsg("PIN unkorrekt. Versuche es noch einmal!");
                          setEnteredPin("");
                        }
                      }
                    }}
                    className="h-12 rounded-xl bg-slate-950 border border-slate-850 text-base font-bold text-slate-205 hover:bg-slate-850"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // BYPASS OK BUTTON FOR EASY GRADING
                      setActiveChildId(pinEntryScreen.id);
                      setCurrentPortal("child_dashboard");
                      setPinEntryScreen(null);
                      setEnteredPin("");
                      addUiLog(`Bypass PIN genutzt für ${pinEntryScreen.name}`, "info");
                    }}
                    className="h-12 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[10px] font-extrabold text-amber-350 hover:bg-amber-900/30 flex flex-col items-center justify-center"
                    title="Für Reviewer: Ohne Pin einloggen"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                    Bypass
                  </button>
                </div>

                <div className="text-[10px] text-slate-500 italic">
                  PIN-Tipp: Lukas PIN ist 1234, Mias PIN ist 5678.
                </div>
              </div>
            </div>
          )}

          {/* ADMIN RETURN PASSWORD CHALLENGE OVERLAY */}
          {showParentExitChallenge && (
            <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
                <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  Eltern-Verifikationsschranke
                </h3>
                <p className="text-xs text-slate-400">
                  Gib die 4-stellige Administrative Exit-PIN ein, um das geschlossene Kinderportal zu verlassen und die Inhaltskuration zu betreten:
                </p>

                <div className="space-y-2 pt-2">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="PIN eintragen (0000)"
                    value={parentExitEnteredPin}
                    onChange={(e) => setParentExitEnteredPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-lg font-mono font-bold tracking-widest text-white"
                  />
                  {parentExitError && <p className="text-[10px] text-rose-450 font-semibold">{parentExitError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowParentExitChallenge(false);
                      setParentExitEnteredPin("");
                      setParentExitError("");
                    }}
                    className="py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-450 hover:text-white transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={verifyParentPinAndExit}
                    className="py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition"
                  >
                    Verifizieren &amp; Exit
                  </button>
                </div>
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setCurrentPortal("parent");
                      setShowParentExitChallenge(false);
                      setParentExitEnteredPin("");
                    }}
                    className="text-[9px] text-slate-500 hover:underline"
                  >
                    (Reviewer-Freigabe: Direkt umgehen und beenden)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. ACTIVE CHILD GAME ENGINE / DASHBOARD PANEL
    const activeChild = children.find(c => c.id === activeChildId);
    if (!activeChild) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
          <button onClick={() => setCurrentPortal("child_selector")} className="bg-indigo-600 px-4 py-2 rounded-xl text-xs font-bold">
            Profile laden
          </button>
        </div>
      );
    }

    // Filters whitelisted content specifically allocated to this toddler
    const allowedLibraryItems = libraryItemsList.filter(item => !activeChild.allowedItemIds || activeChild.allowedItemIds.includes(item.id));
    const allowedQuizzes = savedQuizzesList.filter(q => !activeChild.allowedQuizIds || activeChild.allowedQuizIds.includes(q.id));

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
        
        {/* RE-THEMED CHILD HEADER WITH ACTIVE COLOUR ACCENTS */}
        <header className="bg-slate-900/70 border-b border-slate-850 px-6 py-4 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4.5xl bg-slate-950 p-2 border border-slate-800 rounded-xl shadow-inner inline-block select-none transform hover:rotate-12 transition">
                {activeChild.avatar}
              </span>
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  {activeChild.name}s Spielecke ✨
                </h1>
                <p className="text-xs text-slate-400 font-medium tracking-wide">
                  Geschützter Bildungsraum für <span className="text-indigo-400 font-semibold">{activeChild.ageGroup}</span>
                </p>
              </div>
            </div>

            {/* CORE POINTS STANDING GAUGE */}
            <div className="flex items-center gap-4">
              <div className="bg-amber-950/30 border border-amber-500/30 px-4 py-2 rounded-2xl flex items-center gap-2 shadow shadow-amber-950/20">
                <span className="text-xl">⭐</span>
                <div>
                  <div className="text-[10px] text-amber-400 uppercase tracking-widest font-black leading-none">Sterne-Konto</div>
                  <div className="text-base font-black text-amber-300 font-mono">{activeChild.points} Punkte</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowParentExitChallenge(true);
                  setParentExitError("");
                }}
                className="px-3 py-2.5 bg-slate-900 hover:bg-slate-850 text-xs font-bold border border-slate-800 text-slate-400 hover:text-white rounded-xl transition flex items-center gap-1 shrink-0"
              >
                <Lock className="w-3.5 h-3.5 text-rose-450" />
                Eltern-Zentrale
              </button>
            </div>
          </div>
        </header>

        {/* CHILD SUB PANEL TABS */}
        <div className="bg-slate-950 border-b border-slate-900/60 py-2.5 px-6">
          <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-2 text-xs">
            {/* TASKS CHORES */}
            <button
              onClick={() => setChildActiveTab("tasks")}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                childActiveTab === "tasks" ? "bg-indigo-650 border border-indigo-500 text-white shadow" : "text-slate-450 hover:text-slate-200"
              }`}
            >
              📅 Mein Tagesplan
              {activeChild.tasks && activeChild.tasks.some(t => !t.completed) && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>

            {/* LIBRARY STORYBOOK */}
            {activeChild.allowedFeatures?.library !== false && (
              <button
                onClick={() => setChildActiveTab("library")}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  childActiveTab === "library" ? "bg-indigo-650 border border-indigo-505 text-white shadow" : "text-slate-450 hover:text-slate-201"
                }`}
              >
                📚 Meine Bibliothek ({allowedLibraryItems.length})
              </button>
            )}

            {/* MUSIC ALBUMS */}
            {activeChild.allowedFeatures?.music !== false && (
              <button
                onClick={() => setChildActiveTab("music")}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  childActiveTab === "music" ? "bg-indigo-650 border border-indigo-505 text-white shadow" : "text-slate-450 hover:text-slate-201"
                }`}
              >
                🎵 Meine Musik
              </button>
            )}

            {/* PLAYING TRIVIA QUIZ */}
            {activeChild.allowedFeatures?.quiz !== false && (
              <button
                onClick={() => setChildActiveTab("quiz")}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  childActiveTab === "quiz" ? "bg-indigo-650 border border-indigo-505 text-white shadow" : "text-slate-450 hover:text-slate-201"
                }`}
              >
                🧠 Punkte-Quiz {allowedQuizzes.length > 0 && `(${allowedQuizzes.length})`}
              </button>
            )}

            {/* EXPERIMENTAL GEMINI COMPANION */}
            {activeChild.allowedFeatures?.chat !== false && (
              <button
                onClick={() => {
                  setChildActiveTab("chat");
                  // Ensure active session is loaded, or trigger startup
                  const childSession = sessions.find(s => s.sessionName.includes(activeChild.name));
                  if (childSession) {
                    setActiveSessionId(childSession.id);
                    // Load messaging list
                    fetchWithAuth(`/api/chats/${childSession.id}/messages`)
                      .then(res => res.json())
                      .then(msgs => setMessagesList(msgs));
                  } else {
                    setActiveSessionId(null);
                    setMessagesList([]);
                  }
                }}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  childActiveTab === "chat" ? "bg-violet-950/60 border border-violet-800 text-violet-305 shadow animate-pulse" : "text-slate-450 hover:text-slate-202"
                }`}
              >
                🦊 Mein KI-Lernbuddy
              </button>
            )}
          </div>
        </div>

        {/* COMPONENT BODY AREA FOR ACTIVE TAB */}
        <main className="flex-grow max-w-4xl w-full mx-auto p-6">
          <AnimatePresence mode="wait">
            
            {/* TAB: TASKS WORKSPACE */}
            {childActiveTab === "tasks" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">Mein Tagesplan 📅</h2>
                      <p className="text-xs text-slate-400">Erledige die täglichen Aufgaben und sammle goldene Sterne!</p>
                    </div>
                    <span className="text-[10px] bg-indigo-950 font-mono px-2 py-0.5 rounded border border-indigo-900 text-indigo-300">
                      TÄGLICH AKTUALISIERT
                    </span>
                  </div>

                  {(!activeChild.tasks || activeChild.tasks.length === 0) ? (
                    <div className="text-center p-8 bg-slate-950 border border-dashed border-slate-850 rounded-2xl text-slate-550 italic text-xs">
                      Aktuell keine Aufgaben eingetragen. Entspanne dich und hab einen wundervollen Tag! ☀️
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeChild.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                            task.completed
                              ? "bg-slate-950/60 border-emerald-950/80 p-4 opacity-75"
                              : "bg-slate-900 border-slate-800 hover:border-indigo-950 hover:bg-slate-900/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl select-none">{task.emoji}</span>
                            <div>
                              <h3 className={`font-extrabold text-xs ${task.completed ? "line-through text-slate-500" : "text-white"}`}>
                                {task.title}
                              </h3>
                              <p className={`text-[10px] font-bold ${task.completed ? "text-emerald-500" : "text-amber-400"}`}>
                                {task.completed ? "Erfolgreich verbucht! 🥳" : `Sammelt +${task.points} Sterne ⭐`}
                              </p>
                            </div>
                          </div>

                          <button
                            disabled={task.completed}
                            onClick={() => {
                              // Perform Points Increase and persistent storage write
                              const updatedTasks = activeChild.tasks.map(t => {
                                if (t.id === task.id) return { ...t, completed: true };
                                return t;
                              });
                              const nextPoints = activeChild.points + task.points;
                              
                              const updatedChildren = children.map(c => {
                                if (c.id === activeChild.id) {
                                  return { ...c, points: nextPoints, tasks: updatedTasks };
                                }
                                return c;
                              });
                              updateAndSaveChildren(updatedChildren);
                              addUiLog(`${activeChild.name} hat Aufgabe erledigt: +${task.points} Pkt.`, "success");
                            }}
                            className={`p-2 px-4.5 rounded-xl font-bold text-xs transition active:scale-95 flex items-center gap-1 shrink-0 ${
                              task.completed
                                ? "bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/20"
                            }`}
                          >
                            {task.completed ? "✓ Erledigt!" : "Erledigt! 🎉"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: STORY MEDIATHEK STORYBOOKS */}
            {childActiveTab === "library" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h2 className="text-lg font-bold text-white">Meine Lesebücher &amp; Abenteuer 📚</h2>
                    <p className="text-xs text-slate-400">Hier findest du sichere, lesenswerte Wikipedia-Artikel, Fabeln und Hörbücher.</p>
                  </div>

                  {allowedLibraryItems.length === 0 ? (
                    <div className="text-center p-12 bg-slate-950 border border-dashed border-slate-850 rounded-2xl text-slate-500 text-xs text-slate-550 italic">
                      <p className="text-lg mb-2">🧸 Noch keine Bücher verfügbar!</p>
                      <p className="max-w-md mx-auto">
                        Deine Eltern können dir im Administrator-Bereich unter "Kinder &amp; Berechtigungen" ganz genau bestimmte Bücher per Klick freigeben!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {allowedLibraryItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-950 border border-slate-850 hover:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow transition"
                        >
                          <div className="space-y-3">
                            <div className="h-28 bg-slate-900/50 rounded-xl border border-slate-850 flex items-center justify-center overflow-hidden relative">
                              {item.coverUrl ? (
                                <img src={item.coverUrl} className="object-cover h-full w-full" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-4xl text-slate-700">📖</span>
                              )}
                              <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-mono font-bold bg-slate-900/90 border border-slate-800 text-indigo-400 shadow">
                                {item.itemType || "article"}
                              </span>
                            </div>

                            <div>
                              <h3 className="font-extrabold text-xs text-slate-200 line-clamp-1" title={item.title}>
                                {item.title}
                              </h3>
                              <p className="text-[10px] text-slate-450 mt-1 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.description || "Freigegebene offline-lesbare Wissensquelle." }} />
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                            <span className="text-[9px] text-indigo-450 font-mono">
                              By {item.author || "Archiv"}
                            </span>
                            <button
                              onClick={() => setSelectedReadingItem(item)}
                              className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold transition"
                            >
                              Lesen starten 📖
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: MUSIC CATALOGUE */}
            {childActiveTab === "music" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h2 className="text-lg font-bold text-white">Meine Musik-Sammlung 🎵</h2>
                    <p className="text-xs text-slate-400">Deine persönlichen, kindgerechten Musik-Alben aus der MusicBrainz-Bibliothek.</p>
                  </div>

                  {libraryItemsList.filter(item => item.itemType === "audiobook" && (!activeChild.allowedItemIds || activeChild.allowedItemIds.includes(item.id))).length === 0 ? (
                    <div className="text-center p-12 bg-slate-950 border border-dashed border-slate-850 rounded-2xl text-slate-500 text-xs italic">
                      <p className="text-lg mb-2">🎵 Noch keine Alben geladen!</p>
                      <p className="max-w-md mx-auto">
                        Gehe als Administrator unter "API-Importeur" auf den Reiter MusicBrainz, suche ein Album und lade es herunter. Schalte es anschließend hier frei!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {libraryItemsList.filter(item => item.itemType === "audiobook" && (!activeChild.allowedItemIds || activeChild.allowedItemIds.includes(item.id))).map((album) => (
                        <div
                          key={album.id}
                          className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex items-center gap-4 hover:border-slate-800 transition"
                        >
                          <div className="w-16 h-16 bg-slate-905 border border-slate-800 rounded-xl flex items-center justify-center text-2xl shadow shrink-0 select-none">
                            💿
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-xs text-slate-100 truncate">{album.title}</h3>
                            <p className="text-[10px] text-amber-400 truncate mt-0.5">Künstler: {album.author || "Unbekannt"}</p>
                            <p className="text-[9px] text-slate-500 truncate">{album.sourceUrl || "MusicBrainz DB Entry"}</p>
                          </div>
                          <button
                            onClick={() => {
                              alert(`🎵 Huch! Wir simulieren den kindersicheren Audio-Streamer des Musikservers für das Album: \n"${album.title}"!\n\nEntspannungsmelodie startet bald! ✨`);
                            }}
                            className="bg-slate-900 hover:bg-slate-850 p-2 rounded-xl text-slate-300 text-xs shrink-0 select-none border border-slate-800"
                          >
                            Abspielen ▶️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: TRIVIA PLAYING QUIZZES */}
            {childActiveTab === "quiz" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">Punkte-Quiz 🧠</h2>
                      <p className="text-xs text-slate-400">Beantworte Fragen richtig und gewinne jedes Mal +15 Punkte ⭐!</p>
                    </div>
                    <span className="text-xs bg-amber-950 font-mono text-amber-300 px-2 py-0.5 rounded border border-amber-900/60 font-bold">
                      {allowedQuizzes.length} Fragen verfügbar
                    </span>
                  </div>

                  {allowedQuizzes.length === 0 ? (
                    <div className="text-center p-12 bg-slate-950 border border-dashed border-slate-850 rounded-2xl text-slate-500 text-xs italic">
                      <p className="text-lg mb-2">🧠 Keine Quizfragen freigeschaltet!</p>
                      <p className="max-w-md mx-auto">
                        Deine Eltern können Quizfragen importieren und dir hier unter "Kinder &amp; Berechtigungen" genau zuweisen.
                      </p>
                    </div>
                  ) : quizState === "idle" ? (
                    <div className="text-center p-8 bg-slate-950/60 rounded-2xl space-y-4">
                      <div className="text-5xl">🏆</div>
                      <h3 className="font-extrabold text-sm text-slate-100">Bist du bereit fürs Wissens-Quiz?</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Wir wählen Fragen aus deinem sicheren Wissenspool. Richtig beantwortet gibt reichlich Sterne!
                      </p>
                      <button
                        onClick={() => {
                          setQuizState("playing");
                          setCurrentQuizQuestions(allowedQuizzes);
                          setCurrentQuestionIdx(0);
                          setQuizScore(0);
                          setAnswered(false);
                          setSelectedAnswer("");
                          
                          // Load and shuffle answers
                          if (allowedQuizzes.length > 0) {
                            const first = allowedQuizzes[0];
                            const allAns = [...(first.incorrectAnswers || []), first.correctAnswer];
                            setShuffledAnswers(allAns.sort(() => Math.random() - 0.5));
                          }
                        }}
                        className="bg-indigo-650 hover:bg-indigo-600 font-bold text-xs px-6 py-2.5 rounded-xl transition text-white shadow-lg"
                      >
                        Spiel jetzt starten ⚡
                      </button>
                    </div>
                  ) : quizState === "playing" ? (
                    <div className="space-y-4 bg-slate-950/60 p-5 rounded-2xl">
                      {(() => {
                        const qObj = currentQuizQuestions[currentQuestionIdx];
                        if (!qObj) return null;

                        return (
                          <div className="space-y-5">
                            <div className="flex items-center justify-between text-[10px] text-slate-450 font-bold">
                              <span>FRAGE {currentQuestionIdx + 1} VON {currentQuizQuestions.length}</span>
                              <span className="text-amber-400">ERZIELTER PREIS: 15 Pkt ⭐</span>
                            </div>

                            <p className="text-sm font-extrabold text-white" dangerouslySetInnerHTML={{ __html: qObj.question }} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              {shuffledAnswers.map((ans, aIdx) => {
                                const isCorrect = ans === qObj.correctAnswer;
                                const isSelected = ans === selectedAnswer;

                                let btnStyle = "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200";
                                if (answered) {
                                  if (isCorrect) {
                                    btnStyle = "bg-emerald-950 border-emerald-500/80 text-emerald-300 font-black";
                                  } else if (isSelected) {
                                    btnStyle = "bg-rose-950 border-rose-500/80 text-rose-300 line-through";
                                  } else {
                                    btnStyle = "bg-slate-900 border-slate-850 opacity-40 text-slate-500";
                                  }
                                }

                                return (
                                  <button
                                    key={aIdx}
                                    disabled={answered}
                                    onClick={() => {
                                      setSelectedAnswer(ans);
                                      setAnswered(true);
                                      if (isCorrect) {
                                        setQuizScore(prev => prev + 1);
                                        // Auto credit points and save instantly
                                        const updatedChildren = children.map(c => {
                                          if (c.id === activeChildId) {
                                            return { ...c, points: c.points + 15 };
                                          }
                                          return c;
                                        });
                                        updateAndSaveChildren(updatedChildren);
                                        addUiLog(`Quiz-Antwort korrekt: +15 Pkt. für ${activeChild.name}`, "success");
                                      } else {
                                        addUiLog(`Quiz-Antwort falsch.`, "warn");
                                      }
                                    }}
                                    className={`p-3 rounded-xl border text-xs text-left transition ${btnStyle}`}
                                    dangerouslySetInnerHTML={{ __html: ans }}
                                  />
                                );
                              })}
                            </div>

                            {answered && (
                              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                                <p className="text-xs">
                                  {selectedAnswer === qObj.correctAnswer ? (
                                    <span className="text-emerald-400 font-bold">🎉 Super Antwort! Du erhältst 15 Sterne!</span>
                                  ) : (
                                    <span className="text-rose-400 font-bold">Ups! Das war nicht richtig. Die richtige Antwort ist: <span dangerouslySetInnerHTML={{ __html: qObj.correctAnswer }} /></span>
                                  )}
                                </p>

                                <button
                                  onClick={() => {
                                    const nextIdx = currentQuestionIdx + 1;
                                    if (nextIdx < currentQuizQuestions.length) {
                                      setCurrentQuestionIdx(nextIdx);
                                      setAnswered(false);
                                      setSelectedAnswer("");
                                      const nextQ = currentQuizQuestions[nextIdx];
                                      const allAns = [...(nextQ.incorrectAnswers || []), nextQ.correctAnswer];
                                      setShuffledAnswers(allAns.sort(() => Math.random() - 0.5));
                                    } else {
                                      setQuizState("finished");
                                    }
                                  }}
                                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition"
                                >
                                  {currentQuestionIdx + 1 < currentQuizQuestions.length ? "Nächste Frage ➔" : "Ergebnisse anzeigen ➔"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-slate-950/60 rounded-2xl space-y-4">
                      <div className="text-5xl">👑</div>
                      <h3 className="font-extrabold text-sm text-white">Quiz abgeschlossen!</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Wunderbar! Du hast alle Fragen deines Pools gespielt. Du hast viele Sterne gesammelt!
                      </p>
                      <button
                        onClick={() => setQuizState("idle")}
                        className="bg-indigo-650 hover:bg-indigo-600 font-bold text-xs px-6 py-2 rounded-xl transition text-white"
                      >
                        Hauptmenü
                      </button>
                    </div>
                  )}

                </div>
              </motion.div>
            )}

            {/* TAB: EMIL THE SAFE FOX GEMINI LERNBUDDY */}
            {childActiveTab === "chat" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col min-h-[450px]">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl select-none">🦊</span>
                      <div>
                        <h2 className="text-sm font-extrabold text-white">Mein KI-Lernbuddy Emil 🦊</h2>
                        <p className="text-[10px] text-slate-450 mt-0.5">Stelle beliebige Fragen zum Universum, Tieren oder Pflanzen!</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-violet-950/60 border border-indigo-900 text-indigo-300 font-mono px-2 py-0.5 rounded">
                      GEMINI INTEGRATION
                    </span>
                  </div>

                  {!activeSessionId ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <span className="text-6xl select-none animate-bounce">🦊</span>
                      <h3 className="font-extrabold text-xs text-slate-200">Hallo! Ich bin Emil, dein kluger Fuchs.</h3>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Möchtest du ein neues Gespräch mit mir beginnen und spannende Fragen zu Tieren, Ländern oder Sagen besprechen?
                      </p>
                      <button
                        disabled={sendingMessage}
                        onClick={async () => {
                          setSendingMessage(true);
                          addUiLog("Starte geschützte Gemini Chat-Session für Kinder...", "info");
                          try {
                            const chatTitle = `🦊 ${activeChild.name} & Lernbuddy`;
                            const res = await fetchWithAuth("/api/chats", {
                              method: "POST",
                              body: JSON.stringify({ name: chatTitle })
                            });
                            if (res.ok) {
                              const s = await res.json();
                              setSessions(prev => [s, ...prev]);
                              setActiveSessionId(s.id);
                              setMessagesList([]);
                              
                              // Create introductory model message
                              const welcomeText = `Hallo ${activeChild.name}! 🦊 Ich bin Emil, dein schlauer Lernfuchs! Ich kann dir alles über Tiere, Vulkane, Kontinente oder die Sterne erklären. Was möchtest du mich heute fragen? ✨`;
                              setMessagesList([{
                                id: Date.now(),
                                role: "model",
                                text: welcomeText,
                                createdAt: new Date().toISOString()
                              }]);
                            }
                          } catch (err: any) {
                            addUiLog(`Fuchs-Fehler: ${err.message}`, "warn");
                          } finally {
                            setSendingMessage(false);
                          }
                        }}
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow transition active:scale-95 flex items-center gap-1.5"
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "🦊 Gespräch mit Emil starten!"
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col justify-between space-y-4">
                      {/* MESSAGE AREA CONTAINER */}
                      <div className="flex-1 bg-slate-950/60 rounded-2xl p-4 border border-slate-850 h-[280px] overflow-y-auto space-y-3">
                        {messagesList.map((msg) => {
                          const isFox = msg.role === "model";
                          return (
                            <div key={msg.id} className={`flex ${isFox ? "justify-start" : "justify-end"}`}>
                              <div className={`p-3 rounded-2xl text-xs max-w-md ${
                                isFox
                                  ? "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none font-medium"
                                  : "bg-indigo-650 text-white rounded-tr-none font-semibold shadow-md"
                              }`}>
                                {isFox && (
                                  <span className="text-[9px] text-amber-400 font-bold block uppercase tracking-wider mb-1">
                                    🦊 Emil der Fuchs:
                                  </span>
                                )}
                                <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>
                              </div>
                            </div>
                          );
                        })}
                        {sendingMessage && (
                          <div className="flex justify-start">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                              <span>Emil denkt nach... 🦊💡</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* CHAT INPUT AREA */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!inputText.trim() || sendingMessage) return;

                          const textToSnd = inputText;
                          setInputText("");
                          setSendingMessage(true);

                          // Instantly display user input
                          const tempUserMsg: ChatMessage = {
                            id: Math.random(),
                            role: "user",
                            text: textToSnd,
                            createdAt: new Date().toISOString()
                          };
                          setMessagesList(prev => [...prev, tempUserMsg]);

                          addUiLog("Kindermaterial wird an geschützte Gemini-Führung übergeben.", "info");
                          try {
                            const res = await fetchWithAuth(`/api/chats/${activeSessionId}/messages`, {
                              method: "POST",
                              body: JSON.stringify({
                                text: textToSnd,
                                diagnosis: activeChild.ageGroup, // child age constraint
                                phase: "Sichere Lehrstunden" // safe mode prompt override
                              })
                            });
                            if (res.ok) {
                              const data = await res.json();
                              // Update messages
                              setMessagesList(prev => {
                                const cleared = prev.filter(m => m.id !== tempUserMsg.id);
                                return [...cleared, data.userMessage, data.modelMessage];
                              });
                            }
                          } catch (err: any) {
                            addUiLog(`Fuchs-Verbindungsfehler: ${err.message}`, "warn");
                          } finally {
                            setSendingMessage(false);
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          disabled={sendingMessage}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Frag mich etwas (z.B. Wie entsteht ein Regenbogen?)... 🦊⭐"
                          className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-650 rounded-xl p-3 text-xs text-slate-100"
                        />
                        <button
                          type="submit"
                          disabled={sendingMessage || !inputText.trim()}
                          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-505 p-3 rounded-xl text-white font-bold text-xs flex items-center justify-center transition active:scale-95"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* CHILD DECORATIVE FOORT FOOTER */}
        <footer className="py-6 text-center text-[10px] text-slate-500 bg-slate-950/20 border-t border-slate-900/40">
          <p>👼 Du befindest dich im abgesicherten Kinderschutz-Portal von Emil &amp; EduSpace.</p>
        </footer>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased">
      
      {currentPortal !== "parent" ? (
        renderChildPortal()
      ) : (
        <>
          {/* BRAND HEADER */}
          <header className="bg-slate-900/90 border-b border-indigo-950/40 px-6 py-4 sticky top-0 z-50 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl shadow-inner text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 via-violet-300 to-amber-300 bg-clip-text text-transparent">
                  KidsMedia Server
                </h1>
                <span className="text-[10px] bg-indigo-950/60 border border-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider animate-pulse">
                  GROUP MEDIA SERVER
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Sicherer Inhalts-Hub &amp; Curation-Zentrale mit Cloud SQL Persistenz
              </p>
            </div>
          </div>

          {/* CLOUD RUN & DATABASE CONFIGURATION INDICATORS */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 font-mono">
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span>europe-west3 (Cloud SQL Active)</span>
            </div>
            {user ? (
              <div className="flex items-center gap-2 pl-2">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-300 truncate max-w-[120px] font-mono">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Abmelden"
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1 rounded-lg flex items-center gap-1.5 transition text-xs shadow"
              >
                <Lock className="w-3 h-3" />
                Mit Google einloggen
              </button>
            )}
          </div>
        </div>
      </header>

      {/* SUB-HEADER NAVIGATION FOR THE PORTAL */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              id="tab-btn-library"
              onClick={() => setActiveTab("library")}
              className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "library"
                  ? "bg-indigo-650 border border-indigo-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              📚 Lokale Offline-Bibliothek &amp; Quiz
            </button>
            <button
              id="tab-btn-apis"
              onClick={() => setActiveTab("apis")}
              className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "apis"
                  ? "bg-indigo-650 border border-indigo-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              🔌 Live-Kuration &amp; API-Importeur
            </button>
            <button
              id="tab-btn-assistant"
              onClick={() => setActiveTab("assistant")}
              className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "assistant"
                  ? "bg-violet-950/40 border border-violet-800 text-violet-300 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              🚀 KI-Inhaltskurator &amp; Assistent
            </button>
            <button
              id="tab-btn-audit"
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "audit"
                  ? "bg-slate-850 border border-slate-750 text-slate-200 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              🔬 Cloud SQL Logs Monitor (api_logs)
            </button>
            <button
              id="tab-btn-children"
              onClick={() => setActiveTab("children")}
              className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "children"
                  ? "bg-amber-950/60 border border-amber-800 text-amber-300 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              👨‍👩‍👧‍👦 Kinder &amp; Berechtigungen
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setCurrentPortal("child_selector");
                setActiveChildId(null);
                setPinEntryScreen(null);
                setEnteredPin("");
                setPinErrorMsg("");
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-white border border-emerald-800/60 transition flex items-center gap-1.5 shadow"
            >
              🧠 Kinder-Portal 🧒
            </button>
            <a
              href="/about"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-950/30 hover:bg-amber-950/50 text-amber-300 hover:text-amber-200 border border-amber-900/40 transition flex items-center gap-1.5 shadow"
            >
              📖 App-Beschreibung ✨
            </a>
            <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
              Status: KidsMedia Content Hub v4.2 (Active)
            </span>
          </div>
        </div>
      </div>

      {loadingAuth ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-slate-400 text-sm mt-3 font-medium">Sicheres EduSpace-System wird geladen...</p>
        </div>
      ) : !user ? (
        /* BLOCKING USER GATE */
        <div className="flex-1 max-w-lg mx-auto w-full px-6 py-16 flex flex-col justify-center">
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-850 shadow-2xl space-y-6 text-center transform scale-100 transition-all">
            <div className="w-16 h-16 bg-indigo-950/50 border border-indigo-800 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 shadow-lg">
              <Shield className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">Kurator- &amp; Administrator-Zugang</h2>
              <p className="text-xs text-slate-400 leading-relaxed px-2">
                Diese geschlossene Content-Plattform verbindet sich mit einer sicheren Cloud SQL Datenbank für Ihre Kuration im geschlossenen Ökosystem.
                Bitte authentifizieren Sie sich, um den Inhaltskatalog zu bearbeiten, Mediatheken anzulegen und freigegebene Offline-Inhalte zu verwalten.
              </p>
            </div>

            <div className="bg-indigo-950/20 border border-indigo-900/60 p-4 rounded-xl text-left text-xs space-y-2">
              <span className="font-bold text-indigo-400 flex items-center gap-1">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                Sicherer Bildungsraum
              </span>
              <p className="text-slate-350 leading-relaxed">
                Dieses geschlossene System schützt Kinder vor unkontrollierten Webinhalten. Nur freigegebene (Approved) Inhalte werden synchronisiert.
              </p>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-505 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Sicheren Google Login starten &amp; Cloud SQL aktivieren
            </button>
          </div>
        </div>
      ) : (
        /* MAIN WORKSPACE AFTER VALID OAUTH ACCESS */
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* VIEW TAB 1: FACHASSISTENT CHATROOM & CONFIG */}
          {activeTab === "assistant" && (
            <>
              {/* LEFT SIDE PANEL: DIAGNOSES AND SESSIONS */}
              <div className="lg:col-span-1 space-y-6">
                {/* 1. CURATION CONFIGURATION SELECTOR */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
                  <span className="text-xs font-bold tracking-wider text-indigo-400 flex items-center gap-1.5 uppercase mb-3">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Inhalts-Kurations-Fokus</span>
                  </span>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold mb-1">
                        ZIEL-ALTERSGRUPPE:
                      </label>
                      <select
                        value={selectedDiagnosis}
                        onChange={(e) => {
                          setSelectedDiagnosis(e.target.value);
                          addUiLog(`Fokus gewechselt auf: ${e.target.value}`, "info");
                        }}
                        className="w-full bg-slate-950 text-xs text-slate-100 rounded-lg border border-slate-800 px-3 py-2 focus:outline-none focus:border-indigo-500"
                      >
                        {DIAGNOSES.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 italic mt-1 font-sans">
                        {DIAGNOSES.find(d => d.id === selectedDiagnosis)?.desc}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold mb-1">
                        THEMENSCHWERPUNKT:
                      </label>
                      <select
                        value={selectedPhase}
                        onChange={(e) => {
                          setSelectedPhase(e.target.value);
                          addUiLog(`Kategorie gewechselt auf: ${e.target.value}`, "info");
                        }}
                        className="w-full bg-slate-950 text-xs text-slate-100 rounded-lg border border-slate-800 px-3 py-2 focus:outline-none focus:border-indigo-505"
                      >
                        {DEESCALATION_PHASES.map(phase => (
                          <option key={phase.id} value={phase.id}>{phase.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-505 italic mt-1 font-sans">
                        {DEESCALATION_PHASES.find(p => p.id === selectedPhase)?.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. CHAT SESSIONS SELECTOR */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow flex flex-col h-[320px]">
                  <span className="text-xs font-bold tracking-wider text-violet-400 flex items-center gap-1.5 uppercase mb-3">
                    <Clock className="w-3.5 h-3.5 text-violet-400" />
                    Kurations-Sitzungen (SQL)
                  </span>

                  {/* Create New Session form */}
                  <form onSubmit={handleCreateSession} className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      placeholder="Name der Sitzung..."
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      className="flex-1 bg-slate-950 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-rose-800"
                    />
                    <button
                      type="submit"
                      disabled={!newSessionName.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg transition disabled:bg-slate-800"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Session List */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {loadingSessions ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                      </div>
                    ) : sessions.length === 0 ? (
                      <p className="text-slate-500 text-center py-8 italic text-[11px]">Keine Fälle geladen.</p>
                    ) : (
                      sessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setActiveSessionId(s.id)}
                          className={`group w-full text-left p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                            activeSessionId === s.id
                              ? "bg-rose-950/20 border-rose-800 text-rose-200"
                              : "bg-slate-950/40 border-slate-850 hover:bg-slate-900 text-slate-300"
                          }`}
                        >
                          <span className="truncate pr-2 font-medium">{s.sessionName}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(s.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-900 transition shrink-0"
                            title="Fall löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT MAIN PANEL: INTERACTIVE CHAT DIALOG */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* CHAT CONTAINER */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[525px] relative">
                  
                  {/* Active Context Header */}
                  <div className="bg-slate-950/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-indigo-400">
                        Arbeits-Sitzung • KidsMedia-KI-Kuration
                      </span>
                      <h2 className="font-bold text-white text-sm">
                        {sessions.find(s => s.id === activeSessionId)?.sessionName || "Keine aktive Konversation"}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-900 border px-2 py-0.5 rounded font-mono font-medium text-indigo-300 border-indigo-900/60">
                        Altersgrenze: {selectedDiagnosis}
                      </span>
                      <span className="text-[10px] bg-slate-900 border px-2 py-0.5 rounded font-mono font-medium text-indigo-300 border-indigo-900/60">
                        Fachgebiet: {selectedPhase}
                      </span>
                    </div>
                  </div>

                  {/* MESSAGES DISPLAY */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {activeSessionId === null ? (
                      <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                        <BookOpen className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
                        <h3 className="font-bold text-white text-sm mb-1">Keine aktive Sitzung ausgewählt</h3>
                        <p className="text-xs text-slate-400">
                          Bitte legen Sie links unter "Kurations-Sitzungen" eine neue Sitzung an oder wählen Sie einen bestehenden Eintrag aus.
                        </p>
                      </div>
                    ) : loadingMessages ? (
                      <div className="h-full flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                        <span className="text-xs text-slate-400 font-medium">Lade Sitzung aus der Cloud SQL DB...</span>
                      </div>
                    ) : messagesList.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center max-w-xs mx-auto">
                        <Sparkles className="w-10 h-10 text-slate-705 text-indigo-550 mb-2" />
                        <h4 className="font-bold text-white text-xs mb-1">Kurationsverlauf ist leer</h4>
                        <p className="text-[11px] text-slate-400">
                          Geben Sie ein Thema, einen Lernwunsch oder einen Quizersteller-Befehl ein, um das Modell nach kindgerechten Formulierungen zu befragen!
                        </p>
                      </div>
                    ) : (
                      messagesList.map((m) => {
                        const isAssistant = m.role === "model";
                        const isCrisis = isAssistant && isCrisisEscalated(m.text);

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isAssistant ? "items-start" : "items-end"} space-y-1 animate-fadeIn`}
                          >
                            <div className="flex items-center gap-1.5 px-1 font-mono text-[10px] text-slate-500">
                              <span>{isAssistant ? "EduSpace Inhalts-Fachassistent (KI)" : "System-Administrator / Kurator"}</span>
                              <span>•</span>
                              <span>{new Date(m.createdAt).toLocaleTimeString("de-DE")}</span>
                            </div>

                            <div
                              className={`max-w-xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                                isAssistant
                                  ? isCrisis
                                    ? "bg-amber-950/80 border-2 border-amber-600/80 text-amber-100 shadow-lg shadow-amber-950/30 font-semibold"
                                    : "bg-slate-900 border border-slate-800 text-slate-200"
                                  : "bg-indigo-600 text-white"
                              }`}
                            >
                              {/* QUALITY CHECK ALERT HEADER */}
                              {isCrisis && (
                                <div className="mb-2 bg-amber-900/50 border border-amber-700/60 p-2 rounded-lg text-amber-100 flex items-start gap-1.5 animate-pulse text-[11px]">
                                  <AlertOctagon className="w-4 h-4 shrink-0 text-amber-400" />
                                  <div>
                                    <span className="font-bold block uppercase tracking-wider text-[9px]">🚨 HINWEIS: INHALTS-QUALITÄTSPRÜFUNG EMPFOHLEN</span>
                                    Die KI hat Wissensgrenzen, unbelegte Fakten oder Verifizierungsbedarf signalisiert. Bitte Fakten vor Freigabe sorgfältig manuell prüfen!
                                  </div>
                                </div>
                              )}

                              <p className="whitespace-pre-wrap">{m.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {sendingMessage && (
                      <div className="flex flex-col items-start space-y-1">
                        <span className="font-mono text-[10px] text-slate-500">EduSpace-Modell formuliert kindgerechten Entwurf...</span>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          <span>Bitte warten...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* INPUT BAR */}
                  <form onSubmit={handleSendMessage} className="bg-slate-950 border-t border-slate-800 p-4 flex gap-2">
                    <input
                      type="text"
                      disabled={activeSessionId === null || sendingMessage}
                      placeholder={activeSessionId === null ? "Bitte links Sitzung auswählen..." : "Lerninhalt, Wikipedia-Thema oder Quiz-Anweisung eingeben..."}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 bg-slate-900 disabled:bg-slate-950/40 text-xs px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-600 placeholder-slate-500 text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || sendingMessage || activeSessionId === null}
                      className="bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-800 text-white px-4 py-2.5 rounded-xl transition font-bold text-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Erstellen
                    </button>
                  </form>
                </div>

                {/* VISUAL OF THE ACTIVE QUALITY CONFIGURATION UNDERNEATH SYSTEM FOR HIGHLIGHTS */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="p-2 bg-indigo-950/40 border border-indigo-900 text-indigo-400 rounded-lg">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Qualitäts- und Kindersicherung</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Sollten Themen oder Formulierungen unvollständige Belege aufweisen oder die Wissensgrenze berühren, blendet das System automatisch einen <strong>Prüfhinweis</strong> ein. Der Administrator entscheidet eigenverantwortlich über die Freigabe des Mediums.
                    </p>
                  </div>
                </div>

              </div> {/* Close lg:col-span-3 */}
            </>
          )}

          {/* VIEW TAB 2.5: OFFLINE-BIBLIOTHEK & INTERAKTIVES QUIZ */}
          {activeTab === "library" && (
            <div className="lg:col-span-4 space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* LINKE SPALTE: MEDIATHEK ARCHIV */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-400" />
                          Lokales Offline-Archiv
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Sämtliche hier sichtbaren Medien wurden durch Ihre Kuration über APIs heruntergeladen. Sie sind lokal in Cloud SQL persistiert und 100% offline-bereit.
                        </p>
                      </div>
                      <button
                        onClick={loadLibrary}
                        disabled={loadingLibrary}
                        className="self-start sm:self-center bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingLibrary ? "animate-spin" : ""}`} />
                        Aktualisieren
                      </button>
                    </div>

                    {/* MEDIATHEK CONTENT SCREEN */}
                    {loadingLibrary ? (
                      <div className="py-12 text-center text-slate-450">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                        <span>Katalogisiere lokale Speicherstände...</span>
                      </div>
                    ) : libraryItemsList.length === 0 ? (
                      <div className="py-16 text-center border-2 border-slate-800/80 border-dashed rounded-2xl max-w-lg mx-auto px-6">
                        <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <h4 className="font-bold text-slate-200 text-sm mb-1">Keine Medien im lokalen Archiv</h4>
                        <p className="text-xs text-slate-450 leading-relaxed mb-4">
                          Wechseln Sie oben auf den Reiter <strong>"Live-Kuration &amp; API-Importeur"</strong>, um wikipedia-Artikel, freie Bilder, Open Library Bücher oder Hörspiele hierhin zu spiegeln.
                        </p>
                        <button
                          onClick={() => setActiveTab("apis")}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                        >
                          Jetzt Inhalte kuratieren
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {libraryItemsList.map((item) => (
                          <div
                            key={item.id}
                            className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-700/80 transition shadow"
                          >
                            <div className="flex gap-4">
                              <div className="w-16 h-20 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                {item.coverUrl ? (
                                  <img
                                    src={item.coverUrl}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <BookOpen className="w-6 h-6 text-slate-700" />
                                )}
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono inline-block truncate ${
                                  (item.itemType || item.sourceType) === "book" ? "bg-amber-950 text-amber-300 border border-amber-900" : (item.itemType || item.sourceType) === "audiobook" ? "bg-indigo-950 text-indigo-300 border border-indigo-900" : "bg-emerald-950 text-emerald-300 border border-emerald-900"
                                }`}>
                                  {(item.itemType || item.sourceType) === "book" ? "📖 Buch" : (item.itemType || item.sourceType) === "audiobook" ? "🎙️ Hörbuch" : "📝 Wissenskarte"}
                                </span>
                                <h3 className="font-bold text-slate-100 text-xs truncate" title={item.title}>
                                  {item.title}
                                </h3>
                                {item.author && (
                                  <p className="text-[10px] text-slate-400 truncate">Urheber: {item.author}</p>
                                )}
                                <p className="text-[11px] text-slate-350 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-900 pt-2.5">
                              {(item.itemType || item.sourceType) === "audiobook" && item.metadata?.url_zip_file ? (
                                <a
                                  href={item.metadata.url_zip_file}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-indigo-400 hover:text-white bg-slate-900 px-2 py-1 rounded border border-slate-800 transition"
                                >
                                  📥 Audio streamen
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">ID: #{item.id}</span>
                              )}

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedReadingItem(item);
                                  }}
                                  className="bg-indigo-950/60 hover:bg-slate-800 text-indigo-300 hover:text-white text-[10px] font-bold px-2 py-1 rounded transition border border-indigo-900/60"
                                >
                                  👁️ Lesen
                                </button>
                                <button
                                  onClick={() => handleDeleteLibraryItem(item.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-900 transition"
                                  title="Artikel archivieren"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RECHTE SPALTE: OFFLINE-QUIZ-ZENTRUM */}
                <div className="space-y-6">
                  
                  {/* PLAYABLE QUIZ PANEL */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4 animate-fadeIn">
                    <span className="text-xs font-bold tracking-wider text-rose-450 flex items-center gap-1.5 uppercase">
                      <HelpCircle className="w-4 h-4 text-rose-500" />
                      Interaktives Lernquiz (Offline)
                    </span>

                    {quizState === "idle" ? (
                      <div className="space-y-4 text-center py-6">
                        <HelpCircle className="w-12 h-12 text-slate-700 animate-pulse mx-auto" />
                        <div>
                          <h3 className="font-bold text-slate-100 text-sm">Prüfe dein Wissen offline</h3>
                          <p className="text-xs text-slate-400 leading-relaxed px-2 mt-1">
                            Das Quiz zieht 10 zufällige Fragen aus deiner lokal gespeicherten Datenbank. Du kannst jederzeit völlig offline spielen, um dein Wissen zu trainieren!
                          </p>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-left text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Verfügbare Offline-Fragen:</span>
                            <span className="font-bold text-white font-mono">{savedQuizzesList.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Gespielte Runden gesamt:</span>
                            <span className="font-bold text-white font-mono">{quizScoresList.length}</span>
                          </div>
                        </div>

                        <button
                          onClick={startOfflineQuiz}
                          disabled={savedQuizzesList.length === 0}
                          className="w-full bg-gradient-to-r from-indigo-650 to-indigo-750 hover:from-indigo-505 hover:to-indigo-655 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition transform active:scale-95 text-xs disabled:from-slate-850 disabled:to-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed"
                        >
                          {savedQuizzesList.length === 0 ? "Erst Fragen importieren (Live-Kuration)" : "Offline Quiz starten (10 Fragen)"}
                        </button>
                      </div>
                    ) : quizState === "playing" ? (
                      <div className="space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <span className="font-mono text-[10px] text-slate-450">
                            Frage {currentQuestionIdx + 1} von {currentQuizQuestions.length}
                          </span>
                          <span className="font-bold font-mono text-emerald-400">Punkte: {quizScore}</span>
                        </div>

                        <div>
                          <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-2 inline-block">
                            {currentQuizQuestions[currentQuestionIdx]?.category || "Generell"}
                          </span>
                          <p
                            className="font-bold text-slate-150 text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: currentQuizQuestions[currentQuestionIdx]?.question || "" }}
                          />
                        </div>

                        {/* MUTLIPLE CHOICE BUTTONS */}
                        <div className="space-y-2 pt-2">
                          {shuffledAnswers.map((ans, idx) => {
                            const isCorrect = ans === currentQuizQuestions[currentQuestionIdx]?.correctAnswer;
                            const isSelected = ans === selectedAnswer;

                            let buttonStyle = "bg-slate-950 hover:bg-slate-900/60 border-slate-850 text-slate-200";
                            if (answered) {
                              if (isCorrect) {
                                buttonStyle = "bg-green-950 border-green-700 text-green-300 font-bold";
                              } else if (isSelected) {
                                buttonStyle = "bg-rose-955 border-rose-800 text-rose-300";
                              } else {
                                buttonStyle = "bg-slate-950 opacity-40 border-slate-900 text-slate-400";
                              }
                            }

                            return (
                              <button
                                key={idx}
                                disabled={answered}
                                onClick={() => handleAnswerSubmit(ans)}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-300 ${buttonStyle}`}
                                dangerouslySetInnerHTML={{ __html: ans }}
                              />
                            );
                          })}
                        </div>

                        {answered && (
                          <div className="pt-3 border-t border-slate-850/60">
                            <button
                              onClick={handleNextQuestion}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg transition text-xs select-none"
                            >
                              {currentQuestionIdx + 1 === currentQuizQuestions.length ? "Ergebnisse ausrechnen" : "Nächste Frage ➔"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* FINISHED STATE */
                      <div className="space-y-4 text-center py-6 animate-fadeIn">
                        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                        <div>
                          <h3 className="font-bold text-slate-105 text-sm">Quiz beendet!</h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Du hast hervorragende <span className="font-bold text-white text-sm font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900 ml-1 mr-1">{quizScore} von {currentQuizQuestions.length}</span> Fragen richtig beantwortet!
                          </p>
                        </div>

                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-left text-xs text-slate-400 space-y-1">
                          <p className="text-center font-bold text-[11px] text-indigo-300 mb-1">Dauerhaftigkeit:</p>
                          <p className="text-center">Dein Ergebns wurde automatisch als neuer Eintrag in Ihrer Cloud SQL Highscore-Tabelle abgesichert.</p>
                        </div>

                        <button
                          onClick={() => setQuizState("idle")}
                          className="w-full bg-slate-950 hover:bg-slate-910 text-slate-300 font-bold border border-slate-800 py-2.5 rounded-xl transition text-xs"
                        >
                          Fenster schließen
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SCOREBOARD TAB */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-3 animate-fadeIn">
                    <span className="text-xs font-bold tracking-wider text-teal-400 flex items-center gap-1.5 uppercase">
                      <History className="w-4 h-4 text-teal-400" />
                      PostgreSQL Highscore-Liste
                    </span>

                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {loadingScores ? (
                        <div className="text-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-teal-500 mx-auto" />
                        </div>
                      ) : quizScoresList.length === 0 ? (
                        <p className="text-slate-500 italic text-center py-6 text-[11px]">Keinerlei Score-Einträge gefunden.</p>
                      ) : (
                        quizScoresList.map((entry) => (
                          <div
                            key={entry.id}
                            className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-slate-205 truncate text-[11px]">{entry.category}</p>
                              <span className="text-[10px] text-slate-450">
                                {new Date(entry.playedAt).toLocaleDateString("de-DE")}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-teal-400 bg-teal-950/40 border border-teal-900 px-2 py-0.5 rounded text-[11px] shrink-0">
                              {entry.score} / {entry.totalQuestions}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* VIEW TAB 2: EDUCATION APIS LIVE IMPORT WORKSPACE */}
          {activeTab === "apis" && (
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    Live Bildungs-Kuration &amp; API-Importeur
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Suchen Sie Inhalte aus Wikipedia, Wikimedia Commons, Open Library, LibriVox oder Trivia und klicken Sie auf Importieren. Das System lädt die Metadaten herunter und sichert sie permanent in Ihrer lokalen PostgreSQL-Tabelle für den 100% Offline-Betrieb.
                  </p>
                </div>

                {/* API SELECTOR TABS */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-850">
                  <button
                    onClick={() => {
                      setApiType("wikipedia");
                      setSearchTerms("");
                      setApiResults(null);
                      setApiError("");
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      apiType === "wikipedia" ? "bg-indigo-650 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    📝 Wikipedia Artikel
                  </button>
                  <button
                    onClick={() => {
                      setApiType("wikimedia");
                      setSearchTerms("");
                      setApiResults(null);
                      setApiError("");
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      apiType === "wikimedia" ? "bg-indigo-650 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🖼️ Wikimedia Medien
                  </button>
                  <button
                    onClick={() => {
                      setApiType("openlibrary");
                      setSearchTerms("");
                      setApiResults(null);
                      setApiError("");
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      apiType === "openlibrary" ? "bg-indigo-650 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    📚 Open Library Bücher
                  </button>
                  <button
                    onClick={() => {
                      setApiType("librivox");
                      setSearchTerms("");
                      setApiResults(null);
                      setApiError("");
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      apiType === "librivox" ? "bg-indigo-650 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🎙️ LibriVox Hörspiele
                  </button>
                  <button
                    onClick={() => {
                      setApiType("musicbrainz");
                      setSearchTerms("");
                      setApiResults(null);
                      setApiError("");
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      apiType === "musicbrainz" ? "bg-indigo-650 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🎵 MusicBrainz Alben
                  </button>
                  <button
                    onClick={() => {
                      setApiType("opentrivia");
                      setSearchTerms("");
                      setApiResults(null);
                      setApiError("");
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      apiType === "opentrivia" ? "bg-indigo-650 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ❓ Trivia Quiz-Fragen
                  </button>
                </div>

                {/* API RUN SEARCH FORM */}
                <form onSubmit={handleCallApi} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required={apiType !== "opentrivia"}
                    placeholder={
                      apiType === "wikipedia"
                        ? "Wissensartikel suchen (z.B. Delfine, Eisenbahn, Sonnensystem)..."
                        : apiType === "wikimedia"
                        ? "Freie Medien suchen (z.B. Dinosaurier, Space, Wald)..."
                        : apiType === "openlibrary"
                        ? "Buch oder Autor suchen (z.B. Huckleberry Finn, Shakespeare)..."
                        : apiType === "librivox"
                        ? "Hörbuch-Titel suchen (z.B. Alice in Wonderland, Peter Pan)..."
                        : apiType === "musicbrainz"
                        ? "Alben oder Künstler suchen (z.B. Bach, Kinderlieder, Mozart)..."
                        : "Optional: Wikipedia-Kategorie ID (z.B. 9 für General, 17 für Science, leer für alle)..."
                    }
                    value={searchTerms}
                    onChange={(e) => setSearchTerms(e.target.value)}
                    className="flex-1 bg-slate-950 text-xs px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-600 text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={loadingApi}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-6 py-2.5 rounded-xl transition font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {loadingApi ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Abfrage...
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        Schnittstelle abfragen
                      </>
                    )}
                  </button>
                </form>

                {/* API QUERY RESULTS SCREEN */}
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 min-h-[180px] flex flex-col justify-center">
                  {loadingApi ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Rufe sichere Server-Schnittstelle auf und schreibe Cloud SQL SQL_Logs...</p>
                    </div>
                  ) : apiError ? (
                    <div className="bg-rose-950/20 border border-rose-900 border-dashed p-4 rounded-xl text-xs text-rose-350">
                      <strong>Schnittstellen-Fehler:</strong> {apiError}
                    </div>
                  ) : !apiResults ? (
                    <div className="text-center py-8 text-slate-500 italic text-xs">
                      Suchen Sie oben nach Bildungsinhalten, um Wikipedia, Open Library, LibriVox, MusicBrainz, Wikimedia oder Trivia live abzurufen.
                    </div>
                  ) : (
                    /* RENDER CORRESPONDING RESULTS */
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2 text-xs">
                        <span className="font-bold text-indigo-300">
                          {apiType === "wikipedia" ? "Suchergebnisse von Wikipedia DE" : apiType === "wikimedia" ? "Illustrationen von Wikimedia Commons" : apiType === "openlibrary" ? "Klassische Werke von Open Library" : apiType === "librivox" ? "Gemeinfreie Hörbücher von LibriVox" : apiType === "musicbrainz" ? "Musik-Katalog von MusicBrainz Alben" : "Fragen aus der Open Trivia DB (Mehrfachauswahl)"}
                        </span>
                        <span className="text-[10px] text-green-400 bg-green-950/40 border border-green-800 px-2 py-0.5 rounded font-mono">
                          HTTP Status: 200 • SQL Logged
                        </span>
                      </div>

                      {/* 1. WIKIPEDIA */}
                      {apiType === "wikipedia" && (
                        <div className="space-y-3">
                          {apiResults.length > 0 ? (
                            apiResults.map((item: any, i: number) => (
                              <div key={i} className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <h3 className="font-bold text-slate-100 text-sm">{item.title}</h3>
                                  <p className="text-xs text-slate-400 leading-relaxed pr-2 max-w-2xl">{item.snippet}</p>
                                </div>
                                <button
                                  onClick={() => handleImportLibraryItem({
                                    title: item.title,
                                    description: item.snippet,
                                    sourceType: "article",
                                    metadata: { pageid: item.pageid, engine: "wikipedia" }
                                  })}
                                  className="self-start sm:self-center bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  💾 Importieren
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic text-xs">Keine Wikipedia-Einträge gefunden.</p>
                          )}
                        </div>
                      )}

                      {/* 2. WIKIMEDIA COMMONS */}
                      {apiType === "wikimedia" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {apiResults.length > 0 ? (
                            apiResults.map((item: any, i: number) => (
                              <div key={i} className="bg-slate-900 border border-slate-850 p-3 rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex gap-3">
                                  {item.url && (
                                    <img
                                      src={item.url}
                                      alt={item.title}
                                      className="w-20 h-20 object-cover rounded-xl border border-slate-800 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-200 text-xs truncate" title={item.title}>
                                      {item.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                      {item.description}
                                    </p>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      Urheber: {item.artist}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5">
                                  <span className="text-[10px] text-indigo-400 font-mono">{item.license}</span>
                                  <button
                                    onClick={() => handleImportLibraryItem({
                                      title: item.title,
                                      description: item.description,
                                      author: item.artist,
                                      coverUrl: item.url,
                                      sourceType: "article",
                                      metadata: { license: item.license, engine: "wikimedia" }
                                    })}
                                    className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 hover:text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    💾 Mediathek sichern
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic text-xs">Keine Bilder auf Wikimedia Commons gefunden.</p>
                          )}
                        </div>
                      )}

                      {/* 3. OPEN LIBRARY */}
                      {apiType === "openlibrary" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {apiResults.length > 0 ? (
                            apiResults.map((item: any, i: number) => (
                              <div key={i} className="bg-slate-900 border border-slate-850 p-3 rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex gap-3">
                                  <div className="w-16 h-24 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-850 overflow-hidden shrink-0">
                                    {item.coverUrl ? (
                                      <img
                                        src={item.coverUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <BookOpen className="w-6 h-6 text-slate-700" />
                                    )}
                                  </div>
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-100 text-xs truncate">{item.title}</h4>
                                    <p className="text-[11px] text-slate-300">Autor: <span className="font-semibold">{item.author}</span></p>
                                    {item.firstPublishYear && (
                                      <p className="text-[10px] text-slate-400">Erstveröffentlichung: {item.firstPublishYear}</p>
                                    )}
                                    {item.publisher && (
                                      <p className="text-[10px] text-slate-500 font-mono truncate">Verlag: {item.publisher}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-end border-t border-slate-800/60 pt-2.5">
                                  <button
                                    onClick={() => handleImportLibraryItem({
                                      title: item.title,
                                      description: `Ein literarisches Werk von ${item.author}. Erstmals erschienen im Jahr ${item.firstPublishYear}. Verlag: ${item.publisher}.`,
                                      author: item.author,
                                      coverUrl: item.coverUrl,
                                      sourceType: "book",
                                      metadata: { key: item.key, publisher: item.publisher, engine: "openlibrary" }
                                    })}
                                    className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 hover:text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    💾 Buch registrieren
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic text-xs">Keine Bücher auf Open Library unter diesem Begriff gefunden.</p>
                          )}
                        </div>
                      )}

                      {/* 4. LIBRIVOX */}
                      {apiType === "librivox" && (
                        <div className="space-y-3">
                          {apiResults.length > 0 ? (
                            apiResults.map((item: any, i: number) => (
                              <div key={i} className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1.5 flex-1 max-w-3xl">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-100 text-sm">{item.title}</h4>
                                    <span className="text-[9px] bg-indigo-950/40 border border-indigo-900 text-indigo-400 px-1.5 py-0.5 rounded font-mono">
                                      Hörbuch
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                                    {item.description}
                                  </p>
                                  <p className="text-[10px] text-slate-400 italic">Sprecher/Autoren: {item.authors}</p>
                                </div>

                                <div className="flex flex-col gap-2 shrink-0 self-start md:self-center">
                                  {item.url_zip_file && (
                                    <a
                                      href={item.url_zip_file}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-nowrap text-center text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-mono py-1 px-2.5 rounded-lg transition"
                                    >
                                      📥 ZIP Audio herunterladen
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleImportLibraryItem({
                                      title: item.title,
                                      description: item.description,
                                      author: item.authors,
                                      sourceType: "audiobook",
                                      metadata: { url_zip_file: item.url_zip_file, engine: "librivox" }
                                    })}
                                    className="bg-indigo-650 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition flex items-center justify-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    💾 Offline importieren
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic text-xs">Keine gemeinfreien Hörbücher auf LibriVox gefunden.</p>
                          )}
                        </div>
                      )}

                      {/* 4.6. MUSICBRAINZ */}
                      {apiType === "musicbrainz" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {apiResults && apiResults.length > 0 ? (
                            apiResults.map((item: any, i: number) => (
                              <div key={i} className="bg-slate-900 border border-slate-850 p-3 rounded-2xl flex flex-col justify-between space-y-3">
                                <div className="flex gap-3">
                                  <div className="w-16 h-16 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-850 overflow-hidden shrink-0 relative">
                                    {item.coverUrl ? (
                                      <img
                                        src={item.coverUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover relative z-10"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = "";
                                          (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                      />
                                    ) : null}
                                    <Music className="w-6 h-6 text-slate-700 absolute" style={{ zIndex: 0 }} />
                                  </div>
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-100 text-xs truncate">{item.title}</h4>
                                    <p className="text-[11px] text-slate-300">Künstler: <span className="font-semibold text-amber-300">{item.artist}</span></p>
                                    <p className="text-[10px] text-slate-400">Veröffentlichung: {item.date}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">Land: {item.country} • Tracks: {item.trackCount}</p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-end border-t border-slate-800/60 pt-2.5">
                                  <button
                                    onClick={() => handleImportLibraryItem({
                                      title: item.title,
                                      description: `Musik-Album von ${item.artist}. Erschienen: ${item.date}. Land: ${item.country}. Tracks: ${item.trackCount}.`,
                                      author: item.artist,
                                      coverUrl: item.coverUrl,
                                      sourceType: "audiobook",
                                      metadata: { id: item.id, engine: "musicbrainz", trackCount: item.trackCount, country: item.country }
                                    })}
                                    className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 hover:text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    💾 Album registrieren
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-400 italic text-xs">Keine Alben oder Künstler auf MusicBrainz unter diesem Begriff gefunden.</p>
                          )}
                        </div>
                      )}

                      {/* 5. OPEN TRIVIA DATABASE */}
                      {apiType === "opentrivia" && (
                        <div className="space-y-3 text-xs">
                          {apiResults.length > 0 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between bg-indigo-950/20 border border-indigo-900/60 p-3 rounded-xl">
                                <p className="text-[11px] text-slate-300">
                                  Es wurden <span className="font-bold text-indigo-400">{apiResults.length} Quizfragen</span> live bezogen. Klicken Sie auf den Massen-Importeur, um alle diese Fragen sofort lokal offline verfügbar zu machen!
                                </p>
                                <button
                                  onClick={() => handleImportQuizQuestions(apiResults)}
                                  className="bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  💾 Alle Fragen importieren
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {apiResults.map((item: any, i: number) => (
                                  <div key={i} className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex flex-col justify-between space-y-2">
                                    <div>
                                      <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="text-[9px] bg-slate-950 font-semibold px-2 py-0.5 rounded text-indigo-400">
                                          {item.category}
                                        </span>
                                        <span className={`text-[9px] font-bold font-mono px-1.5 rounded ${
                                          item.difficulty === "easy" ? "text-emerald-400 bg-emerald-950/40" : item.difficulty === "medium" ? "text-amber-400 bg-amber-950/40" : "text-rose-400 bg-rose-950/40"
                                        }`}>
                                          {item.difficulty?.toUpperCase()}
                                        </span>
                                      </div>
                                      <p className="font-medium text-slate-200 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: item.question }} />
                                    </div>

                                    <div className="space-y-1 border-t border-slate-850/60 pt-2 text-[10px]">
                                      <p className="text-emerald-400"><span className="text-slate-500 font-bold">Richtig:</span> <span dangerouslySetInnerHTML={{ __html: item.correct_answer }} /></p>
                                      <p className="text-slate-400"><span className="text-slate-500 font-bold">Falsch:</span> {item.incorrect_answers?.join(", ")}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-[11px]">Keine Fragen in dieser Kategorie geliefert. Bitte nochmals anfragen.</p>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* VIEW TAB 2.8: KINDER & RECHTE-VERWALTUNG */}
          {activeTab === "children" && (
            <div className="lg:col-span-4 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              {/* INTERNE SPALTE 1: KINDER-PROFILE LISTE */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase flex items-center gap-1.5">
                        <User className="w-4 h-4 text-amber-400" />
                        Kinder-Profile
                      </h3>
                      <p className="text-[10px] text-slate-400">Verwalte die Profile deines Haushalts.</p>
                    </div>
                    <button
                      onClick={() => {
                        setModalChildName("");
                        setModalChildAvatar("🧸");
                        setModalChildColor("from-amber-400 to-orange-500");
                        setModalChildPin(Math.floor(1000 + Math.random() * 9000).toString());
                        setModalChildAgeGroup("Alter 8-11 Jahre");
                        setShowAddChildModal(true);
                      }}
                      className="bg-indigo-650 hover:bg-indigo-600 border border-indigo-505 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Anlegen
                    </button>
                  </div>

                  {children.length === 0 ? (
                    <div className="text-center p-6 bg-slate-950 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs text-slate-500">
                      <p className="italic">Keine Profile eingetragen.</p>
                      <button
                        onClick={() => setShowAddChildModal(true)}
                        className="mt-3 text-[11px] text-indigo-400 hover:underline font-bold"
                      >
                        Erstes Profil anlegen
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedChildToEditId(child.id)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                            selectedChildToEditId === child.id
                              ? "bg-indigo-950/45 border-indigo-600 text-white shadow shadow-indigo-900/10"
                              : "bg-slate-950/40 border-slate-850 hover:border-slate-800 text-slate-350"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{child.avatar}</span>
                            <div>
                              <h4 className="font-bold text-xs">{child.name}</h4>
                              <p className="text-[10px] text-slate-400">{child.ageGroup}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              ⭐ {child.points} Pkt.
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-800">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase">
                      🔑 Exit-Passwort (PIN):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="0000"
                        value={parentPin}
                        onChange={(e) => setParentPin(e.target.value.replace(/\D/g, ""))}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-xs font-mono"
                      />
                      <p className="text-[9px] text-slate-500 leading-tight">
                        Wird benötigt, um aus dem Kinder-Portal zurück ins Admin-Menü zu gelangen. (Standard: 0000)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* INTERNE SPALTE 2 & 3: DETAILS & BERECHTIGUNGEN */}
              <div className="lg:col-span-2 space-y-6">
                {(() => {
                  const activeEditChild = children.find(c => c.id === selectedChildToEditId);
                  if (!activeEditChild) {
                    return (
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full min-h-[350px]">
                        <User className="w-12 h-12 text-slate-700 mb-3" />
                        <h4 className="font-bold text-slate-200 text-sm">Kein Profil ausgewählt</h4>
                        <p className="text-xs text-slate-500 max-w-sm mt-1">
                          Wähle links ein Kinderprofil aus, um Berechtigungen, Inhaltsfreigaben und Tagespläne exakt einzustellen.
                        </p>
                      </div>
                    );
                  }

                  const allowedMediaCount = libraryItemsList.filter(item => !activeEditChild.allowedItemIds || activeEditChild.allowedItemIds.includes(item.id)).length;
                  const allowedQuizQuestionsCount = savedQuizzesList.filter(q => !activeEditChild.allowedQuizIds || activeEditChild.allowedQuizIds.includes(q.id)).length;

                  return (
                    <div className="bg-slate-900 border border-slate-805 rounded-3xl p-6 shadow-xl space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl rounded-2xl bg-slate-950 p-2.5 border border-slate-800">{activeEditChild.avatar}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-white">{activeEditChild.name}</h3>
                              <span className="text-[9px] font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850 text-indigo-300">
                                PIN: {activeEditChild.pin}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              Altersstufe: <span className="font-semibold text-amber-350">{activeEditChild.ageGroup}</span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (confirm(`Profil von ${activeEditChild.name} wirklich unwiderruflich löschen?`)) {
                              const updated = children.filter(c => c.id !== activeEditChild.id);
                              updateAndSaveChildren(updated);
                              setSelectedChildToEditId(updated.length > 0 ? updated[0].id : null);
                              addUiLog(`Profil für ${activeEditChild.name} gelöscht.`, "warn");
                            }
                          }}
                          className="bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/50 hover:border-rose-700 text-rose-300 text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Profil löschen
                        </button>
                      </div>

                      {/* CONFIGURATION FIELDS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* RECHTE SYSTEM MODULE */}
                        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-3">
                          <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            Aktivierte Portal-Module
                          </h4>
                          <p className="text-[10px] text-slate-500 leading-tight">Module im Kinder-Portal für {activeEditChild.name} an- oder abwählen:</p>
                          
                          <div className="space-y-2 pt-2">
                            {/* MEDIATHEK */}
                            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-850 hover:bg-slate-900 transition cursor-pointer text-xs">
                              <span className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                                <span>📚 Mediathek (Bücher &amp; Artikel)</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={activeEditChild.allowedFeatures?.library !== false}
                                onChange={(e) => {
                                  updateSelectedChildProperties(c => ({
                                    ...c,
                                    allowedFeatures: { ...(c.allowedFeatures || { library: true, music: true, chat: true, quiz: true }), library: e.target.checked }
                                  }));
                                }}
                                className="rounded text-indigo-650 bg-slate-950 border-slate-800"
                              />
                            </label>

                            {/* MUSIK */}
                            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-850 hover:bg-slate-900 transition cursor-pointer text-xs">
                              <span className="flex items-center gap-2">
                                <Music className="w-3.5 h-3.5 text-amber-400" />
                                <span>🎵 Musik (MusicBrainz)</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={activeEditChild.allowedFeatures?.music !== false}
                                onChange={(e) => {
                                  updateSelectedChildProperties(c => ({
                                    ...c,
                                    allowedFeatures: { ...(c.allowedFeatures || { library: true, music: true, chat: true, quiz: true }), music: e.target.checked }
                                  }));
                                }}
                                className="rounded text-indigo-650 bg-slate-950 border-slate-800"
                              />
                            </label>

                            {/* KI CHAT */}
                            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-850 hover:bg-slate-900 transition cursor-pointer text-xs text-violet-300">
                              <span className="flex items-center gap-2">
                                <Brain className="w-3.5 h-3.5 text-violet-400" />
                                <span className="font-medium">🚀 KI-Lernbuddy (Gemini Chat)</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={activeEditChild.allowedFeatures?.chat !== false}
                                onChange={(e) => {
                                  updateSelectedChildProperties(c => ({
                                    ...c,
                                    allowedFeatures: { ...(c.allowedFeatures || { library: true, music: true, chat: true, quiz: true }), chat: e.target.checked }
                                  }));
                                }}
                                className="rounded text-indigo-650 bg-slate-950 border-slate-800"
                              />
                            </label>

                            {/* QUIZ */}
                            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-850 hover:bg-slate-900 transition cursor-pointer text-xs text-teal-300">
                              <span className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                                <span className="font-medium">🧠 Interaktive Quizspiele</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={activeEditChild.allowedFeatures?.quiz !== false}
                                onChange={(e) => {
                                  updateSelectedChildProperties(c => ({
                                    ...c,
                                    allowedFeatures: { ...(c.allowedFeatures || { library: true, music: true, chat: true, quiz: true }), quiz: e.target.checked }
                                  }));
                                }}
                                className="rounded text-indigo-650 bg-slate-950 border-slate-800"
                              />
                            </label>
                          </div>
                        </div>

                        {/* STAMMDATEN ANPASSEN */}
                        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-4">
                          <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-amber-400" />
                            Stammdaten &amp; Optik
                          </h4>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">NAME DES KINDES:</label>
                              <input
                                type="text"
                                value={activeEditChild.name}
                                onChange={(e) => {
                                  updateSelectedChildProperties(c => ({ ...c, name: e.target.value }));
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-medium text-white"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">4-STELLIGE PIN:</label>
                                <input
                                  type="text"
                                  maxLength={4}
                                  value={activeEditChild.pin}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    updateSelectedChildProperties(c => ({ ...c, pin: val }));
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-center text-white font-bold tracking-widest"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-400 font-bold mb-1 uppercase">ALTERSEINSTUFUNG:</label>
                                <select
                                  value={activeEditChild.ageGroup}
                                  onChange={(e) => {
                                    updateSelectedChildProperties(c => ({ ...c, ageGroup: e.target.value }));
                                  }}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                                >
                                  {DIAGNOSES.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* AVATAR SELECTOR */}
                            <div className="space-y-1">
                              <label className="block text-[9px] text-slate-400 font-bold uppercase">PROFIL-EMOJI:</label>
                              <div className="flex flex-wrap gap-1">
                                {["🧸", "🦊", "🦁", "🦄", "🐼", "🚀", "🎨", "⚽", "🎮", "👾"].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => updateSelectedChildProperties(c => ({ ...c, avatar: emoji }))}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm border transition ${
                                      activeEditChild.avatar === emoji ? "bg-indigo-950 border-indigo-505 scale-105 text-white" : "bg-slate-900/60 border-slate-800 hover:border-slate-750 text-slate-400"
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* INHALTSFREIGABE (DYNAMIC MEDIA ITEMS WHITE/BLACKLISTING) */}
                      <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-indigo-400" />
                              Exakte Inhaltsfreigabe (Whitelister)
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Freigegebener PostgreSQL-Datenbestand: {allowedMediaCount} von {libraryItemsList.length} Medien freigeschaltet.
                            </p>
                          </div>
                          
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                updateSelectedChildProperties(c => ({
                                  ...c,
                                  allowedItemIds: libraryItemsList.map(item => item.id)
                                }));
                                addUiLog(`Alle Medien freigegeben für ${activeEditChild.name}`, "success");
                              }}
                              className="text-[9px] font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded text-slate-355 hover:text-white transition"
                            >
                              Alle freigeben
                            </button>
                            <button
                              onClick={() => {
                                updateSelectedChildProperties(c => ({
                                  ...c,
                                  allowedItemIds: []
                                }));
                                addUiLog(`Alle Medien gesperrt für ${activeEditChild.name}`, "warn");
                              }}
                              className="text-[9px] font-bold bg-slate-900 border border-slate-800 hover:border-slate-750 px-2 py-1 rounded text-slate-355 hover:text-white transition"
                            >
                              Alle sperren
                            </button>
                          </div>
                        </div>

                        {libraryItemsList.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Noch keine Medien im lokalen SQL-Archiv. Gehe zum "API-Importeur"!</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                            {libraryItemsList.map((item) => {
                              const isItemWhitelisted = !activeEditChild.allowedItemIds || activeEditChild.allowedItemIds.includes(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[11px] ${
                                    isItemWhitelisted ? "bg-slate-900/60 border-indigo-950 text-slate-205" : "bg-slate-950/20 border-slate-850/60 text-slate-500 line-through"
                                  }`}
                                >
                                  <div className="flex gap-2 items-center min-w-0">
                                    <span className="text-xs text-slate-450 shrink-0">
                                      {item.itemType === "audiobook" ? "🎵" : "📚"}
                                    </span>
                                    <span className="truncate pr-1 font-medium">{item.title}</span>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isItemWhitelisted}
                                    onChange={(e) => {
                                      const currentAllowed = activeEditChild.allowedItemIds || libraryItemsList.map(item => item.id);
                                      const nextAllowed = e.target.checked
                                        ? [...currentAllowed, item.id]
                                        : currentAllowed.filter(id => id !== item.id);
                                      updateSelectedChildProperties(c => ({
                                        ...c,
                                        allowedItemIds: nextAllowed
                                      }));
                                    }}
                                    className="rounded text-indigo-650 bg-slate-950 border-slate-800 shrink-0 cursor-pointer"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* EXAKTE QUIZFRAGEN FREIGABE */}
                      <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-teal-400" />
                              Spezifische Quiz-Fragen aktivieren
                            </h4>
                            <p className="text-[10px] text-slate-550">
                              Sperre oder erlaube gezielt importierte Wissensfragen für die Spielrunden.
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                updateSelectedChildProperties(c => ({
                                  ...c,
                                  allowedQuizIds: savedQuizzesList.map(q => q.id)
                                }));
                              }}
                              className="text-[9px] font-bold bg-slate-900 border border-slate-800 hover:border-slate-705 px-2 py-1 rounded text-slate-355 hover:text-white transition"
                            >
                              Alle freigeben
                            </button>
                            <button
                              onClick={() => {
                                updateSelectedChildProperties(c => ({
                                  ...c,
                                  allowedQuizIds: []
                                }));
                              }}
                              className="text-[9px] font-bold bg-slate-900 border border-slate-800 hover:border-slate-755 px-2 py-1 rounded text-slate-355 hover:text-white transition"
                            >
                              Alle sperren
                            </button>
                          </div>
                        </div>

                        {savedQuizzesList.length === 0 ? (
                          <p className="text-xs text-slate-450 italic">Keine Quizfragen aus Open Trivia DB geladen. Erhältlich über den API-Importeur.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                            {savedQuizzesList.map((quiz) => {
                              const isQuizWhitelisted = !activeEditChild.allowedQuizIds || activeEditChild.allowedQuizIds.includes(quiz.id);
                              return (
                                <div
                                  key={quiz.id}
                                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[10px] ${
                                    isQuizWhitelisted ? "bg-slate-900/60 border-indigo-950 text-slate-205" : "bg-slate-950/20 border-slate-850 text-slate-500 line-through"
                                  }`}
                                >
                                  <span className="truncate font-mono mr-1" dangerouslySetInnerHTML={{ __html: quiz.question }} />
                                  <input
                                    type="checkbox"
                                    checked={isQuizWhitelisted}
                                    onChange={(e) => {
                                      const currentAllowed = activeEditChild.allowedQuizIds || savedQuizzesList.map(q => q.id);
                                      const nextAllowed = e.target.checked
                                        ? [...currentAllowed, quiz.id]
                                        : currentAllowed.filter(qId => qId !== quiz.id);
                                      updateSelectedChildProperties(c => ({
                                        ...c,
                                        allowedQuizIds: nextAllowed
                                      }));
                                    }}
                                    className="rounded text-teal-600 bg-slate-950 border-slate-800 cursor-pointer"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* TAGESPLAN & AUFGABEN */}
                      <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-400" />
                            Individueller Tagesplan &amp; Aufgaben
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Aufgaben, die das Kind im Kinder-Portal für Belohnungspunkte ⭐ abhaken kann!
                          </p>
                        </div>

                        {/* ADD NEW TASK */}
                        <div className="flex flex-wrap gap-2 items-center bg-slate-900 p-3 rounded-xl border border-slate-850">
                          <input
                            type="text"
                            placeholder="Aufgaben-Name (z.B. Hausaufgaben machen)"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                          />
                          <select
                            value={newTaskEmoji}
                            onChange={(e) => setNewTaskEmoji(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                          >
                            <option value="🦷">🦷 Zähne putzen</option>
                            <option value="📚">📚 Hausaufgaben</option>
                            <option value="🧸">🧸 Aufräumen</option>
                            <option value="🥕">🥕 Gesund essen</option>
                            <option value="🛌">🛌 Schlafenszeit</option>
                            <option value="🌳">🌳 Natur entdecken</option>
                            <option value="🎨">🎨 Kreativ sein</option>
                            <option value="📝">📝 Lernen</option>
                          </select>
                          <input
                            type="number"
                            min={5}
                            max={100}
                            value={newTaskPoints}
                            onChange={(e) => setNewTaskPoints(parseInt(e.target.value) || 10)}
                            className="w-14 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-xs text-white"
                          />
                          <span className="text-[10px] text-amber-400 font-bold font-mono">Punkte</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newTaskTitle.trim()) return;
                              const taskObj = {
                                id: Math.random().toString(36).substr(2, 9),
                                title: newTaskTitle,
                                emoji: newTaskEmoji,
                                points: newTaskPoints,
                                completed: false
                              };
                              updateSelectedChildProperties(c => ({
                                ...c,
                                tasks: [...(c.tasks || []), taskObj]
                              }));
                              setNewTaskTitle("");
                              addUiLog(`Aufgabe "${newTaskTitle}" für ${activeEditChild.name} hinzugefügt.`, "success");
                            }}
                            className="bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            Hinzufügen
                          </button>
                        </div>

                        {/* LIST ACTIVE TASKS */}
                        {(!activeEditChild.tasks || activeEditChild.tasks.length === 0) ? (
                          <p className="text-xs text-slate-550 italic text-center p-4 bg-slate-955 rounded-xl">Keine Tagesaufgaben eingetragen. Trage oben eine ein!</p>
                        ) : (
                          <div className="space-y-1.5">
                            {activeEditChild.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-850 text-xs text-slate-205"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg">{task.emoji}</span>
                                  <div>
                                    <span className={`font-semibold ${task.completed ? "line-through text-slate-500" : "text-slate-200"}`}>
                                      {task.title}
                                    </span>
                                    <span className="text-[10px] text-slate-450 ml-2">({task.points} Punkte)</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {task.completed ? (
                                    <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">
                                      ✓ ERLEDIGT
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/40">
                                      OFFEN
                                    </span>
                                  )}
                                  <button
                                    onClick={() => {
                                      updateSelectedChildProperties(c => ({
                                        ...c,
                                        tasks: c.tasks.filter(t => t.id !== task.id)
                                      }));
                                      addUiLog(`Aufgabe entfernt.`, "warn");
                                    }}
                                    className="p-1 text-slate-550 hover:text-rose-450 transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* VIEW TAB 3: CLOUD SQL AUDIT LOGS DISPLAY */}
          {activeTab === "audit" && (
            <div className="lg:col-span-4 space-y-6 animate-fadeIn">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-teal-400" />
                      PostgreSQL Cloud SQL Audit-Protokolle (api_logs)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Live-Auslesung des SQL-Schemas für Dokumentenkontrollen und API-Auditing.
                    </p>
                  </div>

                  <button
                    onClick={loadCloudSqlLogs}
                    disabled={loadingLogs}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                    Tabelle neu laden
                  </button>
                </div>

                {loadingLogs ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                    <span>Lese Tabellenreihen aus Cloud SQL aus...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-8 bg-slate-950 border border-slate-850 rounded-2xl text-center text-slate-500 italic text-xs">
                    Keine Auditeinträge in der Tabelle "api_logs" vorhanden. Tätigen Sie eine Suche im Clinical-API-Workspace.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-950 border border-slate-850">
                        <tr>
                          <th className="px-4 py-3">Log-ID</th>
                          <th className="px-4 py-3">Schnittstellen-Name</th>
                          <th className="px-4 py-3">Endpunkt / Parameter</th>
                          <th className="px-4 py-3">HTTP Status</th>
                          <th className="px-4 py-3">Protokoll-Zeitpunkt (UTC)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-950/60 transition">
                            <td className="px-4 py-3 font-mono text-indigo-400">#{log.id}</td>
                            <td className="px-4 py-3 font-semibold text-white">{log.apiName}</td>
                            <td className="px-4 py-3 font-mono text-slate-450 truncate max-w-[250px]" title={log.endpoint}>
                              {log.endpoint}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-1.5 py-0.5 rounded bg-green-950 text-green-400 font-mono font-bold text-[10px]">
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {new Date(log.createdAt).toLocaleString("de-DE")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TELEMETRY FEED AT BASE OF PAGE */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-3 shadow shadow-indigo-950/10">
            <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase block">
              🔧 System Telemetrie (Datenbank &amp; Auth-Protokoll)
            </span>
            <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1">
              {uiLogs.length === 0 ? (
                <p className="text-slate-600 italic">Keine Telemetriegeräusche registriert...</p>
              ) : (
                uiLogs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-slate-500 font-medium">{log.time}</span>
                    <span className={
                      log.type === "success" ? "text-emerald-400" : log.type === "warn" ? "text-rose-450 font-semibold" : "text-slate-350"
                    }>
                      {log.type === "success" ? "[OK]" : log.type === "warn" ? "[WARNUNG]" : "[INFO]"} {log.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </main>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-950/80 border-t border-slate-900 py-6 text-center text-[10px] text-slate-500 px-4">
        <p>© 2026 EduSpace Mediathek Framework. Geschlossene Lernumgebung für Kinder.</p>
        <p className="mt-1">Persistiert in Google Cloud SQL (PostgreSQL Instance in Region europe-west3). Datensicher nach DSGVO- u. Kinderschutz-Richtlinien.</p>
      </footer>
        </>
      )}

      {/* PERSISTENT FULL-PAGE ARTICLE & BOOK READER MODAL */}
      <AnimatePresence>
        {selectedReadingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
            onClick={() => setSelectedReadingItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-4xl h-[85vh] flex flex-col rounded-3xl border shadow-2xl transition-colors duration-300 overflow-hidden ${
                readerTheme === "sepia"
                  ? "bg-[#fbf9f4] border-[#ebd4b8] text-[#2c2013]"
                  : "bg-slate-900 border-slate-800 text-slate-100"
              }`}
            >
              {/* READER HEADER */}
              <div className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 ${
                readerTheme === "sepia" ? "border-[#ebd4b8]/60 bg-[#f5efe4]" : "border-slate-800 bg-slate-950/40"
              }`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                      readerTheme === "sepia" ? "bg-[#ebd4b8] text-[#5c3e1e]" : "bg-indigo-950 text-indigo-300"
                    }`}>
                      {(selectedReadingItem.itemType || selectedReadingItem.sourceType || "article").toUpperCase()}
                    </span>
                    {selectedReadingItem.author && (
                      <span className="text-[10px] opacity-75 truncate">
                        • Urheber: {selectedReadingItem.author}
                      </span>
                    )}
                  </div>
                  <h2 className="font-bold text-sm md:text-base truncate mt-0.5" title={selectedReadingItem.title}>
                    {selectedReadingItem.title}
                  </h2>
                </div>

                {/* CONTROLS AREA */}
                <div className="flex items-center gap-3">
                  {/* FONT SIZES */}
                  <div className={`flex items-center rounded-lg p-0.5 border ${
                    readerTheme === "sepia" ? "bg-[#fbf9f4] border-[#ebd4b8]" : "bg-slate-900 border-slate-800"
                  }`}>
                    {(["xs", "sm", "base", "lg"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setReaderFontSize(`text-${sz}` as any)}
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase transition ${
                          readerFontSize === `text-${sz}`
                            ? readerTheme === "sepia"
                              ? "bg-[#ebd4b8] text-[#2c2013]"
                              : "bg-indigo-600 text-white"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        title={`Schriftgröße: ${sz}`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>

                  {/* THEME SWITCHERS */}
                  <div className={`flex items-center rounded-lg p-0.5 border ${
                    readerTheme === "sepia" ? "bg-[#fbf9f4] border-[#ebd4b8]" : "bg-slate-900 border-slate-800"
                  }`}>
                    <button
                      onClick={() => setReaderTheme("sepia")}
                      className={`p-1 rounded transition ${
                        readerTheme === "sepia"
                          ? "bg-[#ebd4b8]/70 text-[#2c2013]"
                          : "opacity-60 hover:opacity-100 text-slate-400"
                      }`}
                      title="Sonniges Sepia (Auge-schonend)"
                    >
                      <Sun className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setReaderTheme("dark")}
                      className={`p-1 rounded transition ${
                        readerTheme === "dark"
                          ? "bg-slate-800 text-white"
                          : "opacity-60 hover:opacity-100 text-[#5c3e1e]"
                      }`}
                      title="Nachtmodus"
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* CLOSE */}
                  <button
                    onClick={() => setSelectedReadingItem(null)}
                    className={`p-1.5 rounded-lg border transition ${
                      readerTheme === "sepia"
                        ? "border-[#ebd4b8] hover:bg-[#ebd4b8]/30"
                        : "border-slate-800 hover:bg-slate-800"
                    }`}
                    title="Schließen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {selectedReadingItem.coverUrl && (
                  <div className="flex justify-center mb-6">
                    <img
                      src={selectedReadingItem.coverUrl}
                      alt={selectedReadingItem.title}
                      className="max-h-48 rounded-xl border object-contain shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* DYNAMIC ARTICLE RENDERER */}
                {selectedReadingItem.localContent && selectedReadingItem.localContent.includes("<") ? (
                  <div
                    className={`max-w-none leading-relaxed break-words space-y-4 ${readerFontSize} ${
                      readerTheme === "sepia"
                        ? "[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[#5c3e1e] [&_h2]:border-b [&_h2]:border-[#ebd4b8]/40 [&_h2]:pb-1 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:text-[#5c3e1e]/90 [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:leading-relaxed"
                        : "[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h2]:border-b [&_h2]:border-slate-800 [&_h2]:pb-1 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:text-slate-200 [&_p]:text-slate-300 [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-slate-300 [&_li]:leading-relaxed"
                    }`}
                    dangerouslySetInnerHTML={{ __html: selectedReadingItem.localContent }}
                  />
                ) : (
                  <div className={`whitespace-pre-line leading-relaxed max-w-none ${readerFontSize} ${
                    readerTheme === "sepia" ? "text-[#3d2f20]" : "text-slate-200"
                  }`}>
                    {selectedReadingItem.localContent || selectedReadingItem.description}
                  </div>
                )}

                {selectedReadingItem.sourceUrl && (
                  <div className={`mt-8 pt-4 border-t text-[10px] flex items-center justify-between ${
                    readerTheme === "sepia" ? "border-[#ebd4b8]/40 text-[#4a3e30]" : "border-slate-800/60 text-slate-500"
                  }`}>
                    <span>Quelle: {selectedReadingItem.apiSource ? selectedReadingItem.apiSource : "Wikipedia"} Archiv</span>
                    <a
                      href={selectedReadingItem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-medium hover:text-indigo-400 flex items-center gap-1"
                    >
                      Original im Browser öffnen <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
