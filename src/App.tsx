import { useState, useRef, useEffect } from "react";
import type { UserStory } from "@/data/sampleData";
import { STATUS_OPTIONS } from "@/data/sampleData";
import { SALESFORCE_CLOUDS } from "@/data/cloudContext";
import { StoryCard } from "@/components/StoryCard";
import { EditModal } from "@/components/EditModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportToExcel } from "@/utils/exportExcel";
import { extractTextFromPDF, extractTextFromPDFPages, detectPDFFlows } from "@/utils/pdfExtract";
import type { PDFFlowInfo } from "@/utils/pdfExtract";
import { buildCopyablePrompt, parseStoriesFromJSON, saveReferenceContext, getReferenceContextMeta, clearReferenceContext } from "@/utils/generateStories";
import type { ReferenceContext, ProcessFlow } from "@/utils/generateStories";
import { formatAnswersForPrompt } from "@/utils/clarifyQuestions";
import type { ClarifyAnswers } from "@/utils/clarifyQuestions";
import { logUsageEvent } from "@/utils/supabase";
import {
  Upload,
  FileText,
  Zap,
  Download,
  Plus,
  Search,
  RefreshCw,
  BarChart3,
  Clock,
  X,
  ChevronRight,
  AlertCircle,
  Copy,
  Check,
  ClipboardPaste,
  BookOpen,
  // Trash2 as TrashIcon,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "upload" | "references" | "cloud-select" | "processing" | "prompt-ready" | "stories";

interface Session {
  id: string;
  filename: string;
  cloudKey: string;
  cloudName: string;
  createdAt: string;
  updatedAt: string;
  stories: UserStory[];
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const SESSIONS_KEY = "storyforge_sessions";

function loadSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]") as Session[];
  } catch {
    return [];
  }
}

function saveSession(session: Session) {
  const sessions = loadSessions().filter((s) => s.id !== session.id);
  sessions.unshift(session);
  const trimmed = sessions.slice(0, 20);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
}

function deleteSession(id: string) {
  const sessions = loadSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

// ─── Counter ──────────────────────────────────────────────────────────────────

let idCounter = 1;
const newId = () => `US-${String(idCounter++).padStart(3, "0")}`;

// ─── Default reference docs ──────────────────────────────────────────────────

interface DefaultDoc {
  id: string;
  label: string;
  description: string;
  nameKey: keyof ReferenceContext;
  textKey: keyof ReferenceContext;
}

const DEFAULT_DOCS: DefaultDoc[] = [
  { id: "guide", label: "User Story Quality Guide", description: "Persona rules, AC standards, and structural best practices", nameKey: "guideName", textKey: "guideText" },
  { id: "examples", label: "Process-to-Story Mapping Guide", description: "Decomposition rules, worked examples, and pattern library", nameKey: "examplesName", textKey: "examplesText" },
  { id: "practices", label: "Salesforce Leading Practices", description: "Best practices by capability area for AI design decisions", nameKey: "practicesName", textKey: "practicesText" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("upload");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedCloud, setSelectedCloud] = useState<string>("");
  const [stories, setStories] = useState<UserStory[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [processingStatus, setProcessingStatus] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [pastedJSON, setPastedJSON] = useState("");
  const [parseError, setParseError] = useState("");
  const [copied, setCopied] = useState(false);
  const [_extractedText, setExtractedText] = useState("");
  const [detectedFlows, setDetectedFlows] = useState<PDFFlowInfo[]>([]);
  const [selectedFlowPages, setSelectedFlowPages] = useState<{start: number; end: number} | null>(null);
  const [refMeta, setRefMeta] = useState<ReferenceContext | null>(() => getReferenceContextMeta());
  // Removed docs (user clicked X on a default)
  const [removedDocs, setRemovedDocs] = useState<Set<string>>(new Set());
  // Additional file uploads
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [refSaving, setRefSaving] = useState(false);
  // Cloud screen: implementation approach + story depth
  const [implApproach, setImplApproach] = useState("migration");
  const [storyDepth, setStoryDepth] = useState("standard");
  const fileRef = useRef<HTMLInputElement>(null);
  const additionalFileRef = useRef<HTMLInputElement>(null);

  // Load sessions on mount
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  // ─── File handling ─────────────────────────────────────────────────────────

  const handleFileChosen = async (file: File) => {
    setPendingFile(file);
    setPendingFiles([file]);
    setDetectedFlows([]);
    setSelectedFlowPages(null);

    // Auto-detect flows in PDF files with multiple pages
    if (file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const flows = await detectPDFFlows(file);
        if (flows.length > 1) {
          setDetectedFlows(flows);
        }
      } catch {
        // Flow detection failed silently — user can still proceed with full PDF
      }
    }

    setView("references");
  };

  const handleFilesChosen = (files: File[]) => {
    if (files.length === 0) return;
    setPendingFile(files[0]);
    setPendingFiles(files);
    setView("references");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 1) {
      handleFilesChosen(Array.from(files));
    } else if (files && files.length === 1) {
      handleFileChosen(files[0]);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      handleFilesChosen(files);
    } else if (files.length === 1) {
      handleFileChosen(files[0]);
    }
  };

  // ─── Generate prompt (free mode) ──────────────────────────────────────────

  const startFreeMode = async (cloudKey: string) => {
    if (!pendingFile && pendingFiles.length === 0) return;
    setSelectedCloud(cloudKey);
    setProcessingError("");
    setView("processing");

    try {
      const answers: ClarifyAnswers = {
        implementation_approach: implApproach,
        story_depth: storyDepth,
      };
      const ctx = formatAnswersForPrompt(answers);

      if (pendingFiles.length > 1) {
        // Multi-flow mode: extract text from each file, build deduplicated prompt
        setProcessingStatus(`Extracting text from ${pendingFiles.length} process flow documents...`);
        const flows: ProcessFlow[] = [];
        for (let i = 0; i < pendingFiles.length; i++) {
          setProcessingStatus(`Extracting text from document ${i + 1} of ${pendingFiles.length}: ${pendingFiles[i].name}...`);
          const text = await extractTextFromPDF(pendingFiles[i]);
          flows.push({ name: pendingFiles[i].name.replace(/\.[^.]+$/, ""), text });
        }
        // Use first flow's text as the extractedText for backward compat
        setExtractedText(flows.map(f => f.text).join("\n\n---\n\n"));
        const prompt = buildCopyablePrompt(flows[0].text, cloudKey, ctx, flows);
        setGeneratedPrompt(prompt);
      } else if (selectedFlowPages && pendingFile) {
        // Single file with specific page range selected (user picked a flow from multi-flow PDF)
        const flowInfo = detectedFlows.find(f => f.pageNumber === selectedFlowPages.start);
        setProcessingStatus(`Extracting "${flowInfo?.title ?? 'selected flow'}" from document...`);
        const text = await extractTextFromPDFPages(pendingFile, selectedFlowPages.start, selectedFlowPages.end);
        setExtractedText(text);
        const prompt = buildCopyablePrompt(text, cloudKey, ctx);
        setGeneratedPrompt(prompt);
      } else {
        // Single flow mode — full PDF
        setProcessingStatus("Extracting text from document...");
        const text = await extractTextFromPDF(pendingFile!);
        setExtractedText(text);
        const prompt = buildCopyablePrompt(text, cloudKey, ctx);
        setGeneratedPrompt(prompt);
      }

      // Log flow upload event
      const flowCount = pendingFiles.length > 1 ? pendingFiles.length : 1;
      logUsageEvent("flow_uploaded", flowCount, {
        filename: pendingFile?.name ?? "unknown",
        mode: pendingFiles.length > 1 ? "multi" : selectedFlowPages ? "flow-selected" : "single",
      }).catch(() => {}); // fire-and-forget

      setPastedJSON("");
      setParseError("");
      setCopied(false);
      setView("prompt-ready");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract PDF text.";
      setProcessingError(msg);
    }
  };

  // ─── Save additional files to reference context ───────────────────────────

  const saveRefs = async () => {
    setRefSaving(true);
    const readFileText = (file: File): Promise<string> =>
      new Promise((res) => {
        const reader = new FileReader();
        reader.onload = (e) => res((e.target?.result as string) ?? "");
        reader.readAsText(file);
      });

    const newCtx: Omit<ReferenceContext, "savedAt"> = {
      guideText: removedDocs.has("guide") ? "" : refMeta?.guideText,
      guideName: removedDocs.has("guide") ? "" : refMeta?.guideName,
      examplesText: removedDocs.has("examples") ? "" : refMeta?.examplesText,
      examplesName: removedDocs.has("examples") ? "" : refMeta?.examplesName,
      practicesText: removedDocs.has("practices") ? "" : refMeta?.practicesText,
      practicesName: removedDocs.has("practices") ? "" : refMeta?.practicesName,
      fieldCatalogueText: refMeta?.fieldCatalogueText,
      fieldCatalogueName: refMeta?.fieldCatalogueName,
    };

    // If any additional files were uploaded, concatenate them into fieldCatalogue slot
    // (field catalogue + any additional context)
    if (additionalFiles.length > 0) {
      const parts: string[] = [];
      if (newCtx.fieldCatalogueText) parts.push(newCtx.fieldCatalogueText);
      for (const f of additionalFiles) {
        const text = await readFileText(f);
        parts.push(`--- ${f.name} ---\n${text}`);
      }
      newCtx.fieldCatalogueText = parts.join("\n\n");
      newCtx.fieldCatalogueName = additionalFiles.map(f => f.name).join(", ");
    }

    saveReferenceContext(newCtx);
    setRefMeta(getReferenceContextMeta());
    setAdditionalFiles([]);
    setRefSaving(false);
  };

  // ─── Session management ────────────────────────────────────────────────────

  const loadSessionIntoView = (session: Session) => {
    setCurrentSession(session);
    setStories(session.stories);
    idCounter = session.stories.length + 1;
    setView("stories");
  };

  const persistCurrentSession = (updatedStories: UserStory[]) => {
    if (!currentSession) return;
    const updated: Session = {
      ...currentSession,
      stories: updatedStories,
      updatedAt: new Date().toISOString(),
    };
    setCurrentSession(updated);
    saveSession(updated);
    setSessions(loadSessions());
  };

  // ─── Load stories from pasted JSON ────────────────────────────────────────

  const handleLoadFromJSON = () => {
    setParseError("");
    try {
      const parsed = parseStoriesFromJSON(pastedJSON);
      if (parsed.length === 0) throw new Error("No stories found in the pasted JSON.");
      const cloud = SALESFORCE_CLOUDS.find((c) => c.key === selectedCloud);
      const sessionId = `sess_${Date.now()}`;
      const session: Session = {
        id: sessionId,
        filename: pendingFile?.name ?? "Pasted response",
        cloudKey: selectedCloud,
        cloudName: cloud?.name ?? "Salesforce",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stories: parsed,
      };
      saveSession(session);
      setSessions(loadSessions());
      setCurrentSession(session);
      setStories(parsed);
      setView("stories");

      // Log stories generated event
      logUsageEvent("stories_generated", parsed.length, {
        filename: pendingFile?.name ?? "unknown",
        cloud: selectedCloud,
      }).catch(() => {}); // fire-and-forget
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON. Please paste the full response from Claude.");
    }
  };

  // ─── Story CRUD ────────────────────────────────────────────────────────────

  const handleSaveEdit = (updated: UserStory) => {
    const newStories = stories.map((s) => (s.id === updated.id ? updated : s));
    setStories(newStories);
    setEditingStory(null);
    persistCurrentSession(newStories);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this user story?")) {
      const newStories = stories.filter((s) => s.id !== id);
      setStories(newStories);
      if (expandedId === id) setExpandedId(null);
      persistCurrentSession(newStories);
    }
  };

  const handleAddStory = () => {
    const blank: UserStory = {
      id: newId(),
      processStepId: "",
      processStepName: "",
      title: "New User Story",
      actor: "",
      action: "",
      benefit: "",
      fullStory: "As a [], I want to [], so that [].",
      acceptanceCriteria: ["System behaves as expected under normal conditions"],
      primarySystem: "Salesforce",
      secondarySystem: "N/A",
      priority: "Medium",
      status: "Draft",
    };
    const newStories = [blank, ...stories];
    setStories(newStories);
    setEditingStory(blank);
    persistCurrentSession(newStories);
  };

  // ─── Filters ───────────────────────────────────────────────────────────────

  const filtered = stories.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.processStepName.toLowerCase().includes(q) ||
      s.fullStory.toLowerCase().includes(q) ||
      s.actor.toLowerCase().includes(q);
    const matchPriority = filterPriority === "All" || s.priority === filterPriority;
    const matchStatus = filterStatus === "All" || s.status === filterStatus;
    return matchSearch && matchPriority && matchStatus;
  });

  const uniqueSteps = new Set(stories.map((s) => s.processStepId)).size;

  // ─── Shared Header ─────────────────────────────────────────────────────────

  const Header = ({ step, stepLabel: _stepLabel }: { step?: number; stepLabel?: string }) => (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
      <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
        <Zap size={14} className="text-white" />
      </div>
      <div className="flex-1">
        <span className="font-bold text-slate-900 text-sm">Sales Transformation User Story Builder</span>
      </div>
      {step && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-1.5">
              {n > 1 && <ChevronRight size={10} className="text-slate-300" />}
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${n <= step ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>{n}</span>
              <span className={n === step ? "font-semibold text-slate-700" : ""}>
                {n === 1 ? "Upload" : n === 2 ? "Configure" : "Generate"}
              </span>
            </div>
          ))}
        </div>
      )}
    </header>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Upload View ────────────────────────────────────────────────────────────
  if (view === "upload") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center px-4 py-10 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8 w-full">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Process Flow → User Stories
            </h1>
            <p className="text-slate-500 text-base leading-relaxed">
              Upload a process flow document and generate detailed, client-ready Salesforce
              user stories powered by Claude AI.
            </p>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/30 group mb-4"
          >
            <div className="w-12 h-12 bg-slate-100 group-hover:bg-blue-100 rounded-xl mx-auto mb-4 flex items-center justify-center transition-colors">
              <Upload size={22} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">Drop your process flow(s) here</p>
            <p className="text-sm text-slate-400 mb-1">Supports PDF, PNG, JPG — select multiple files for cross-flow deduplication</p>
            <p className="text-xs text-blue-500 mb-4">Upload multiple related process flows to automatically deduplicate shared stories</p>
            <span className="inline-block px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800">
              Browse Files
            </span>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple onChange={handleFileChange} className="hidden" />
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mb-8">
            {[
              { icon: <Zap size={15} className="text-amber-600" />, bg: "bg-amber-50", label: "AI-Powered", desc: "Claude generates stories from process steps" },
              { icon: <FileText size={15} className="text-blue-600" />, bg: "bg-blue-50", label: "Fully Editable", desc: "Edit every field inline" },
              { icon: <Download size={15} className="text-emerald-600" />, bg: "bg-emerald-50", label: "Excel Export", desc: "Formatted catalogue download" },
            ].map((f) => (
              <div key={f.label} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                <div className={`w-7 h-7 ${f.bg} rounded-md mx-auto mb-2 flex items-center justify-center`}>{f.icon}</div>
                <p className="text-xs font-semibold text-slate-700">{f.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>

          {sessions.length > 0 && (
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent Sessions</span>
              </div>
              <div className="space-y-2">
                {sessions.slice(0, 5).map((sess) => {
                  const cloud = SALESFORCE_CLOUDS.find((c) => c.key === sess.cloudKey);
                  return (
                    <div key={sess.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group" onClick={() => loadSessionIntoView(sess)}>
                      <span className="text-lg flex-shrink-0">{cloud?.icon ?? "⚡"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{sess.filename}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{sess.cloudName} &bull; {sess.stories.length} stories &bull; {new Date(sess.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight size={15} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        <button onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); setSessions(loadSessions()); }} className="text-slate-200 hover:text-red-400 transition-colors p-1">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── References View (Consolidated) ────────────────────────────────────────
  if (view === "references") {
    const activeDocs = DEFAULT_DOCS.filter(d => !removedDocs.has(d.id));
    const hasFieldCat = !!(refMeta?.fieldCatalogueName);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header step={2} stepLabel="Configure" />
        <div className="flex-1 flex flex-col items-center px-4 py-8 max-w-3xl mx-auto w-full">

          {/* File info */}
          <div className="w-full flex items-center gap-2 text-sm text-slate-500 mb-6 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
            <FileText size={14} />
            <span className="truncate font-medium text-slate-700">
              {pendingFiles.length > 1 ? `${pendingFiles.length} process flows selected` : pendingFile?.name}
            </span>
            {pendingFiles.length > 1 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Dedup Mode</span>
            )}
            <div className="flex-1" />
            <button onClick={() => { setPendingFile(null); setPendingFiles([]); setView("upload"); }} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
          </div>

          {/* ── Flow Selection (multi-flow PDF detected) ── */}
          {detectedFlows.length > 1 && (
            <div className="w-full mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold text-amber-900 mb-1">Multiple process flows detected in this PDF</p>
                    <p>Select which flow to generate stories for. Generating from the entire PDF may mix unrelated process flows.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedFlowPages(null)}
                  className={`w-full bg-white border rounded-lg px-4 py-3 flex items-center gap-3 text-left transition-all ${
                    !selectedFlowPages ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    !selectedFlowPages ? "border-blue-500" : "border-slate-300"
                  }`}>
                    {!selectedFlowPages && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Entire PDF (all pages)</p>
                    <p className="text-xs text-slate-400">Includes all {detectedFlows.length} flows — may produce mixed results</p>
                  </div>
                </button>
                {detectedFlows.map((flow, idx) => {
                  // Determine end page: next flow's start - 1, or same page if last
                  const nextFlow = detectedFlows[idx + 1];
                  const endPage = nextFlow ? nextFlow.pageNumber - 1 : flow.pageNumber + Math.max(0, Math.floor(flow.charCount / 5000));
                  const isSelected = selectedFlowPages?.start === flow.pageNumber;
                  return (
                    <button
                      key={flow.pageNumber}
                      onClick={() => setSelectedFlowPages({ start: flow.pageNumber, end: endPage })}
                      className={`w-full bg-white border rounded-lg px-4 py-3 flex items-center gap-3 text-left transition-all ${
                        isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "border-blue-500" : "border-slate-300"
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{flow.title}</p>
                        <p className="text-xs text-slate-400">~{Math.round(flow.charCount / 1000)}K chars extracted</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Section 1: Pre-loaded Reference Documents ── */}
          <div className="w-full mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Reference Documents</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pre-loaded and included in every AI prompt. Remove any that don't apply.</p>
              </div>
              {removedDocs.size > 0 && (
                <button
                  onClick={() => { setRemovedDocs(new Set()); clearReferenceContext(); setRefMeta(getReferenceContextMeta()); }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Restore all
                </button>
              )}
            </div>

            {activeDocs.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-sm text-slate-400">
                All reference documents removed. The AI will use its general knowledge.
              </div>
            ) : (
              <div className="space-y-2">
                {activeDocs.map((doc) => (
                  <div key={doc.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{doc.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{doc.description}</p>
                    </div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 font-medium flex-shrink-0">default</span>
                    <button
                      onClick={() => setRemovedDocs(new Set([...removedDocs, doc.id]))}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {/* Field Catalogue if loaded */}
                {hasFieldCat && (
                  <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">Field Catalogue</p>
                      <p className="text-xs text-slate-400 mt-0.5">{refMeta?.fieldCatalogueName}</p>
                    </div>
                    <span className="text-[10px] text-blue-700 bg-blue-50 rounded px-1.5 py-0.5 font-medium flex-shrink-0">uploaded</span>
                    <button
                      onClick={() => {
                        const newCtx: Omit<ReferenceContext, "savedAt"> = { ...refMeta, fieldCatalogueText: "", fieldCatalogueName: "" };
                        saveReferenceContext(newCtx);
                        setRefMeta(getReferenceContextMeta());
                      }}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Section 2: Upload Additional Files ── */}
          <div className="w-full mb-8">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900">Upload Additional Files</h2>
              <p className="text-xs text-slate-500 mt-0.5">Optional — add context to improve AI output quality.</p>
            </div>

            {/* Instructions / recommendations */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2.5">
                <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 space-y-1.5">
                  <p className="font-semibold text-blue-900">Recommended uploads for best results:</p>
                  <ul className="space-y-1 text-blue-700">
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span><strong>Field Catalogue / Data Dictionary</strong> — Ensures AI uses your exact field names and object mappings instead of generic OOB defaults</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span><strong>Persona Matrix</strong> — Maps job titles to functional roles for consistent actor naming</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span><strong>Integration Inventory</strong> — Lists source/target systems so the AI generates accurate integration stories</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span><strong>Business Rules Catalogue</strong> — Validation rules, thresholds, and conditional logic the AI should reference</span>
                    </li>
                  </ul>
                  <p className="text-[11px] text-blue-600 mt-1">Accepts .txt, .csv, .xlsx, .docx, .md files. Upload multiple files at once.</p>
                </div>
              </div>
            </div>

            {/* Upload area */}
            <div
              onClick={() => additionalFileRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/30 group"
            >
              <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center transition-colors">
                <Plus size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-600 group-hover:text-blue-700">Click to upload additional files</p>
              <p className="text-xs text-slate-400 mt-1">Or drag and drop here</p>
              <input
                ref={additionalFileRef}
                type="file"
                accept=".txt,.md,.csv,.xlsx,.xls,.docx,.doc"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) setAdditionalFiles(prev => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Uploaded files list */}
            {additionalFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {additionalFiles.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2.5">
                    <FileText size={13} className="text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                    <span className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(0)}KB</span>
                    <button
                      onClick={() => setAdditionalFiles(prev => prev.filter((_, j) => j !== i))}
                      className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="w-full flex gap-3">
            <Button variant="outline" className="h-11" onClick={() => { setPendingFile(null); setView("upload"); }}>
              ← Back
            </Button>
            <Button
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-11"
              disabled={refSaving}
              onClick={async () => {
                if (additionalFiles.length > 0 || removedDocs.size > 0) {
                  await saveRefs();
                }
                setView("cloud-select");
              }}
            >
              {refSaving ? "Saving..." : "Continue →"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Cloud Select + Options View ──────────────────────────────────────────
  if (view === "cloud-select") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header step={3} stepLabel="Generate" />
        <div className="flex-1 flex flex-col items-center px-4 py-8 max-w-3xl mx-auto w-full">

          {/* File info */}
          <div className="w-full flex items-center gap-2 text-sm text-slate-500 mb-6 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
            <FileText size={14} />
            <span className="truncate font-medium text-slate-700">
              {pendingFiles.length > 1 ? `${pendingFiles.length} process flows selected` : pendingFile?.name}
            </span>
            {pendingFiles.length > 1 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Cross-Flow Dedup</span>
            )}
          </div>

          {/* Salesforce Cloud */}
          <div className="w-full mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Select Salesforce Cloud</h2>
            <p className="text-xs text-slate-500 mb-4">Shapes terminology, OOB features, and story format.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SALESFORCE_CLOUDS.map((cloud) => (
                <button
                  key={cloud.key}
                  onClick={() => setSelectedCloud(cloud.key)}
                  className={`bg-white border rounded-xl p-4 text-left transition-all ${
                    selectedCloud === cloud.key
                      ? "border-blue-400 ring-2 ring-blue-100 shadow-sm"
                      : "border-slate-200 hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <span className="text-2xl mb-2 block">{cloud.icon}</span>
                  <p className="font-semibold text-sm text-slate-800 mb-1">{cloud.name}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{cloud.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Implementation Approach */}
          <div className="w-full mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Implementation Approach</h3>
            <p className="text-xs text-slate-400 mb-3">Influences migration, change management, and integration considerations.</p>
            <div className="flex gap-2">
              {[
                { value: "greenfield", label: "Greenfield", desc: "New build, no legacy" },
                { value: "migration", label: "Migration", desc: "Replacing existing system" },
                { value: "enhancement", label: "Enhancement", desc: "Adding to existing SF org" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setImplApproach(opt.value)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    implApproach === opt.value
                      ? "bg-blue-50 border-blue-300 text-blue-800"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"
                  }`}
                >
                  <p className={`text-xs font-semibold ${implApproach === opt.value ? "text-blue-800" : "text-slate-700"}`}>{opt.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Story Depth */}
          <div className="w-full mb-8">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Story Depth</h3>
            <p className="text-xs text-slate-400 mb-3">Controls how granularly the process flow is decomposed.</p>
            <div className="flex gap-2">
              {[
                { value: "detailed", label: "Detailed", desc: "One story per action" },
                { value: "standard", label: "Standard", desc: "Balanced grouping" },
                { value: "high_level", label: "High-Level", desc: "Broader, fewer stories" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStoryDepth(opt.value)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    storyDepth === opt.value
                      ? "bg-blue-50 border-blue-300 text-blue-800"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"
                  }`}
                >
                  <p className={`text-xs font-semibold ${storyDepth === opt.value ? "text-blue-800" : "text-slate-700"}`}>{opt.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="w-full flex gap-3">
            <Button variant="outline" className="h-11" onClick={() => setView("references")}>
              ← Back
            </Button>
            <Button
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-11 gap-2"
              disabled={!selectedCloud}
              onClick={() => startFreeMode(selectedCloud)}
            >
              <Zap size={14} />
              Generate Stories
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Prompt Ready View ─────────────────────────────────────────────────────
  if (view === "prompt-ready") {
    const cloud = SALESFORCE_CLOUDS.find((c) => c.key === selectedCloud);

    // Split the prompt into system prompt + user message at the divider
    const promptParts = generatedPrompt.split("\n\n---\n\n");
    const systemPrompt = promptParts[0] ?? "";
    const userMessage = promptParts.slice(1).join("\n\n---\n\n");

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">

          {/* Context bar */}
          <div className="flex items-center gap-2 mb-6 text-sm text-slate-600">
            <FileText size={14} />
            <span className="truncate font-medium">{pendingFile?.name}</span>
            <span className="text-slate-300">•</span>
            <span>{cloud?.icon} {cloud?.name}</span>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Copy & Paste into Claude</h2>
            <div className="flex items-start gap-6">
              {[
                { n: 1, text: "Copy the prompt below", color: "bg-blue-600" },
                { n: 2, text: "Paste into claude.ai in a new conversation", color: "bg-blue-600" },
                { n: 3, text: "Copy Claude's JSON response and paste it back here", color: "bg-slate-300" },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-2.5 flex-1">
                  <span className={`w-6 h-6 ${s.color} text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}>{s.n}</span>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Two-column layout: system prompt + user message */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* System Prompt */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-slate-900 text-sm">System Prompt</p>
                  <p className="text-[11px] text-slate-400">Reference docs, rules, and practices</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(systemPrompt);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Copy size={11} /> Copy
                </button>
              </div>
              <textarea
                readOnly
                value={systemPrompt}
                className="w-full h-48 text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none"
              />
            </div>

            {/* User Message */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-slate-900 text-sm">User Message</p>
                  <p className="text-[11px] text-slate-400">Process flow text + instructions</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userMessage);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <Copy size={11} /> Copy
                </button>
              </div>
              <textarea
                readOnly
                value={userMessage}
                className="w-full h-48 text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* Navigation + copy all */}
          <div className="mb-6">
            <div className="flex gap-3 mb-3">
              <Button variant="outline" className="h-11" onClick={() => setView("cloud-select")}>
                ← Back
              </Button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPrompt);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  copied
                    ? "bg-emerald-50 border-2 border-emerald-300 text-emerald-700"
                    : "bg-slate-900 border-2 border-slate-900 text-white hover:bg-slate-700"
                }`}
              >
                {copied ? <><Check size={16} /> Copied! Now paste into claude.ai</> : <><Copy size={16} /> Copy Full Prompt to Clipboard</>}
              </button>
            </div>
            <p className="text-center text-[11px] text-slate-400 mt-2">
              Open <a href="https://claude.ai" target="_blank" rel="noreferrer" className="text-blue-600 underline">claude.ai</a>, start a new conversation, and paste the full prompt.
            </p>
          </div>

          {/* Paste response back */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="font-bold text-slate-900 text-sm mb-0.5">Paste Claude's Response</p>
            <p className="text-xs text-slate-500 mb-3">
              After Claude replies, copy the full JSON response (starts with <code className="bg-slate-100 px-1 rounded text-[10px]">[</code> ends with <code className="bg-slate-100 px-1 rounded text-[10px]">]</code>) and paste below.
            </p>
            <textarea
              value={pastedJSON}
              onChange={(e) => { setPastedJSON(e.target.value); setParseError(""); }}
              placeholder="Paste Claude's JSON response here..."
              className="w-full h-40 text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            {parseError && (
              <div className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                {parseError}
              </div>
            )}
            <div className="flex justify-end mt-3">
              <Button
                size="sm"
                disabled={!pastedJSON.trim()}
                onClick={handleLoadFromJSON}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 gap-1.5 px-4 disabled:opacity-40"
              >
                <ClipboardPaste size={13} />
                Load Stories
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Processing View ────────────────────────────────────────────────────────
  if (view === "processing") {
    const cloud = SALESFORCE_CLOUDS.find((c) => c.key === selectedCloud);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="text-center max-w-sm px-4">
          {processingError ? (
            <>
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Processing Error</h2>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-left">
                {processingError}
              </p>
              <Button variant="outline" size="sm" onClick={() => { setProcessingError(""); setView("cloud-select"); }}>
                ← Back
              </Button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Extracting Process Flow</h2>
              <p className="text-sm text-slate-500 mb-1 truncate max-w-xs mx-auto">{pendingFile?.name}</p>
              <p className="text-xs text-blue-600 font-medium">{cloud?.icon} {cloud?.name}</p>
              <p className="text-sm text-slate-400 mt-3">{processingStatus}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Stories View ────────────────────────────────────────────────────────────
  const cloud = SALESFORCE_CLOUDS.find((c) => c.key === (currentSession?.cloudKey ?? selectedCloud));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Sales Transformation User Story Builder</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          {cloud && (
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium flex-shrink-0">
              {cloud.icon} {cloud.name}
            </span>
          )}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <BarChart3 size={12} className="text-slate-400" />
              <strong className="text-slate-700">{stories.length}</strong>&nbsp;stories
            </span>
            <span><strong className="text-slate-700">{uniqueSteps}</strong> steps</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handleAddStory}>
              <Plus size={13} /> Add Story
            </Button>
            <Button size="sm" className="text-xs h-8 gap-1.5 bg-slate-900 hover:bg-slate-800 text-white" onClick={() => exportToExcel(stories)}>
              <Download size={13} /> Export Excel
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5 text-slate-500" onClick={() => { setStories([]); setCurrentSession(null); setPendingFile(null); setView("upload"); }}>
              <RefreshCw size={13} /> New Upload
            </Button>
          </div>
        </div>
        {currentSession && (
          <div className="max-w-5xl mx-auto px-4 pb-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <FileText size={11} />
              <span className="truncate">{currentSession.filename}</span>
              <span>•</span>
              <span>Last updated {new Date(currentSession.updatedAt).toLocaleString()}</span>
              <span>•</span>
              <span className="text-emerald-600 font-medium">Auto-saved</span>
            </div>
          </div>
        )}
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stories..." className="pl-8 h-8 text-xs" />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-xs">All Priorities</SelectItem>
              {(["High", "Medium", "Low"] as const).map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-xs">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || filterPriority !== "All" || filterStatus !== "All") && (
            <span className="text-xs text-slate-500">{filtered.length} of {stories.length} stories</span>
          )}
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Search size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No stories match your filters</p>
            <p className="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                isExpanded={expandedId === story.id}
                onToggle={() => setExpandedId(expandedId === story.id ? null : story.id)}
                onEdit={setEditingStory}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {editingStory && (
        <EditModal story={editingStory} onSave={handleSaveEdit} onClose={() => setEditingStory(null)} />
      )}
    </div>
  );
}
