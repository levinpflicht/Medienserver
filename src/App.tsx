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
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
  X,
  Info
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

// Clinical Targets
const CLINICAL_DIAGNOSES = [
  { id: "ADHS", name: "ADHS (Impulsivität & Reizüberflutung)", desc: "Schnelle Reizüberflutung, massive Impulsivität, geringe Frustrationstoleranz." },
  { id: "PTBS", name: "PTBS (Trauma-Trigger & Hyperarousal)", desc: "Ankündigung aller Pflege-Handlungen, extrem hoher Eigenschutzabstand, Grounding-Techniken (5-4-3-2-1)." },
  { id: "Psychose", name: "Psychose (Wahn & Halluzinationen)", desc: "Wahninhalte weder validieren (bestätigen) noch dekonstruieren (ausreden), Gefühle spiegeln." },
  { id: "Borderline", name: "Borderline-Persönlichkeitsstörung", desc: "Spaltungs- & Idealisierungstendenzen managen, klare neutrale Abgrenzung, Validierung ohne Verstärkung von Dysfunktion." },
  { id: "Autismus", name: "Autismus-Spektrum-Störung (ASS)", desc: "Absolute strukturelle Vorhersehbarkeit, keine Metaphern/Redewendungen, Reizreduktion." }
];

// Clinical Crisis Intervention Phases
const CLINICAL_PHASES = [
  { id: "Phase I: Prä-Krise", name: "Phase I: Prä-Krise (Anspannung)", desc: "Aktives non-direktives Zuhören, sensorischer Abbau (Snoezelenraum), Bedarfsmedikation anbieten." },
  { id: "Phase II: Akute Krise", name: "Phase II: Akute Krise (Eskalation)", desc: "Physischer Eigenschutz, monotone ruhige Zurufe, seitliche Ausrichtung der Körpersprache." },
  { id: "Phase III: Nachsorge", name: "Phase III: Nachsorge (Reflexion)", desc: "Physisches Wohlbefinden sichern (Decke, Wasser), retrospektives Debriefing mit Patient & Pflegeteam." }
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

  // APP TABS: "assistant" (Chat Room) | "apis" (API-Importeur) | "library" (Offline-Mediathek) | "audit" (Cloud SQL logs)
  const [activeTab, setActiveTab] = useState<"assistant" | "apis" | "library" | "audit">("library");

  // SYSTEM MODES: "educational" (EduSpace) | "clinical" (Clinical Deescalation)
  const [selectedMode, setSelectedMode] = useState<"educational" | "clinical">("educational");
  const [oberarztAlert, setOberarztAlert] = useState<string | null>(null);

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
  const [apiType, setApiType] = useState<"wikipedia" | "wikimedia" | "openlibrary" | "librivox" | "opentrivia">("wikipedia");
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

  // SCROLL TO CHAT END
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList]);

  // DETECT OBERARZT ALERTS IN ACTIVE CONVERSATION
  useEffect(() => {
    if (selectedMode !== "clinical") {
      setOberarztAlert(null);
      return;
    }
    const hasAlarm = messagesList.some(m =>
      m.role === "model" &&
      (m.text.includes("OBERARZT INFORMIEREN") || m.text.includes("OA informieren") || m.text.includes("Pflegeteam alarmieren") || m.text.includes("Oberarzt (OA) informieren"))
    );
    if (hasAlarm) {
      setOberarztAlert("🚨 OBERARZT-MELDEPFLICHT AUSGELÖST: In diesem Szenario liegt eine akute Fremd- oder Selbstgefährdung vor! Bitte alarmieren Sie unverzüglich Ihr Stations-Team.");
    } else {
      setOberarztAlert(null);
    }
  }, [messagesList, selectedMode]);

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
      const res = await fetchWithAuth("/api/clinical-api/logs");
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased">
      
      {/* BRAND HEADER */}
      <header className="bg-slate-900/90 border-b border-indigo-950/40 px-6 py-4 sticky top-0 z-50 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl shadow-inner text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 via-violet-300 to-teal-400 bg-clip-text text-transparent">
                  EduSpace Mediathek
                </h1>
                <span className="text-[10px] bg-indigo-950/60 border border-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                  NETFLIX FÜR BILDUNG
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Geschlossene Offline-Edukations-Plattform &amp; Kuration mit Cloud SQL Persistenz
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
          </div>
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            Status: EduSpace Content Hub v4.0 (Active)
          </span>
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

                {/* MODUS-UMSCHALTER: PÄDAGOGIK VS KLINIK */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 flex items-center gap-1.5 uppercase mb-3">
                    <Activity className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                    System-Betriebsmodus
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="mode-btn-edu"
                      onClick={() => {
                        setSelectedMode("educational");
                        setSelectedDiagnosis("Alter 8-11 Jahre");
                        setSelectedPhase("Natur & Biologie");
                        addUiLog("Betriebsmodus auf Schulung & Kuration geschaltet.", "info");
                      }}
                      className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center border cursor-pointer ${
                        selectedMode === "educational"
                          ? "bg-indigo-950/50 border-indigo-500/80 text-indigo-300 shadow-md"
                          : "bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-350"
                      }`}
                    >
                      <BookOpen className="w-4 h-4 mb-1 shrink-0" />
                      <span>EduSpace</span>
                    </button>
                    <button
                      id="mode-btn-clinical"
                      onClick={() => {
                        setSelectedMode("clinical");
                        setSelectedDiagnosis("ADHS");
                        setSelectedPhase("Phase I: Prä-Krise");
                        addUiLog("Betriebsmodus auf Deeskalations-Trainer geschaltet.", "info");
                      }}
                      className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center border cursor-pointer ${
                        selectedMode === "clinical"
                          ? "bg-emerald-950/50 border-emerald-500/80 text-emerald-300 shadow-md"
                          : "bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-350"
                      }`}
                    >
                      <Activity className="w-4 h-4 mb-1 shrink-0" />
                      <span>Stations-Trainer</span>
                    </button>
                  </div>
                </div>
                
                {/* 1. ENVIRONMENT SPECIFIC SELECTOR */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
                  <span className="text-xs font-bold tracking-wider text-indigo-400 flex items-center gap-1.5 uppercase mb-3">
                    {selectedMode === "clinical" ? (
                      <>
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Klinischer Selektor</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Kurations-Selektor</span>
                      </>
                    )}
                  </span>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold mb-1">
                        {selectedMode === "clinical" ? "PATIENTENHINTERGRUND / DIAGNOSE:" : "ZIEL-ALTERSGRUPPE:"}
                      </label>
                      <select
                        value={selectedDiagnosis}
                        onChange={(e) => {
                          setSelectedDiagnosis(e.target.value);
                          addUiLog(`Fokus gewechselt auf: ${e.target.value}`, "info");
                        }}
                        className="w-full bg-slate-950 text-xs text-slate-100 rounded-lg border border-slate-800 px-3 py-2 focus:outline-none focus:border-indigo-500"
                      >
                        {(selectedMode === "clinical" ? CLINICAL_DIAGNOSES : DIAGNOSES).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 italic mt-1 font-sans">
                        {(selectedMode === "clinical" ? CLINICAL_DIAGNOSES : DIAGNOSES).find(d => d.id === selectedDiagnosis)?.desc}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 font-bold mb-1">
                        {selectedMode === "clinical" ? "DEESKALATIONSPHASE:" : "THEMENSCHWERPUNKT:"}
                      </label>
                      <select
                        value={selectedPhase}
                        onChange={(e) => {
                          setSelectedPhase(e.target.value);
                          addUiLog(`Kategorie gewechselt auf: ${e.target.value}`, "info");
                        }}
                        className="w-full bg-slate-950 text-xs text-slate-100 rounded-lg border border-slate-800 px-3 py-2 focus:outline-none focus:border-indigo-505"
                      >
                        {(selectedMode === "clinical" ? CLINICAL_PHASES : DEESCALATION_PHASES).map(phase => (
                          <option key={phase.id} value={phase.id}>{phase.name}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 italic mt-1 font-sans">
                        {(selectedMode === "clinical" ? CLINICAL_PHASES : DEESCALATION_PHASES).find(p => p.id === selectedPhase)?.desc}
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
                      <span className={`text-[10px] font-bold font-mono tracking-wider uppercase ${selectedMode === "clinical" ? "text-emerald-400" : "text-indigo-400"}`}>
                        {selectedMode === "clinical" ? "Simulations-Lauf • Deeskalations-Trainer" : "Arbeits-Sitzung • EduSpace-KI-Kuration"}
                      </span>
                      <h2 className="font-bold text-white text-sm">
                        {sessions.find(s => s.id === activeSessionId)?.sessionName || "Keine aktive Konversation"}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] bg-slate-900 border px-2 py-0.5 rounded font-mono font-medium ${selectedMode === "clinical" ? "text-emerald-300 border-emerald-900/60" : "text-indigo-300 border-indigo-900/60"}`}>
                        {selectedMode === "clinical" ? "Patient: " : "Altersgrenze: "}{selectedDiagnosis}
                      </span>
                      <span className={`text-[10px] bg-slate-900 border px-2 py-0.5 rounded font-mono font-medium ${selectedMode === "clinical" ? "text-emerald-300 border-emerald-900/60" : "text-indigo-300 border-indigo-900/60"}`}>
                        {selectedMode === "clinical" ? "Phase: " : "Fachgebiet: "}{selectedPhase}
                      </span>
                    </div>
                  </div>

                  {/* OBERARZT EMERGENCY ALERT BANNER */}
                  {oberarztAlert && (
                    <div className="bg-red-950/70 border-b border-red-800 px-6 py-2.5 flex items-start gap-2.5 animate-pulse">
                      <div className="bg-red-900/80 border border-red-500 rounded p-1 text-red-100 shrink-0 select-none">
                        <AlertOctagon className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-red-200">Kritische Eskalation detektiert!</p>
                        <p className="text-red-300/90 text-[10px] font-mono leading-tight mt-0.5">{oberarztAlert}</p>
                      </div>
                    </div>
                  )}

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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-850">
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
                      Suchen Sie oben nach Bildungsinhalten, um Wikipedia, Open Library, LibriVox, Wikimedia oder Trivia live abzurufen.
                    </div>
                  ) : (
                    /* RENDER CORRESPONDING RESULTS */
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2 text-xs">
                        <span className="font-bold text-indigo-300">
                          {apiType === "wikipedia" ? "Suchergebnisse von Wikipedia DE" : apiType === "wikimedia" ? "Illustrationen von Wikimedia Commons" : apiType === "openlibrary" ? "Klassische Werke von Open Library" : apiType === "librivox" ? "Gemeinfreie Hörbücher von LibriVox" : "Fragen aus der Open Trivia DB (Mehrfachauswahl)"}
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
