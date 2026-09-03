"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronDown,
  AlertCircle,
  Terminal,
  List,
  Code2,
  CheckCircle2,
} from "lucide-react";
import { realProblems } from "@/app/lib/tracer/problems";
import { runProblem } from "@/app/lib/tracer/runner";
import type { RealProblem, TraceFrame, SupportedLanguage } from "@/app/lib/tracer/types";
import { SUPPORTED_LANGUAGES } from "@/app/lib/tracer/types";
import { Visualizer } from "./Visualizer";

const MIN_SPEED = 200;
const MAX_SPEED = 2000;

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
};

function starterForProblem(problem: RealProblem, language: SupportedLanguage): string {
  return problem.starterCodeByLanguage?.[language] ?? problem.starterCode;
}

function monacoLanguage(language: SupportedLanguage): string {
  if (language === "typescript") return "typescript";
  if (language === "python") return "python";
  return "javascript";
}

export function Playground() {
  const { resolvedTheme } = useTheme();
  const [problem, setProblem] = useState<RealProblem>(realProblems[0]);
  const [language, setLanguage] = useState<SupportedLanguage>(problem.language);
  const [code, setCode] = useState(starterForProblem(problem, problem.language));
  const [frames, setFrames] = useState<TraceFrame[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [error, setError] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<"console" | "trace">("console");

  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationsRef = useRef<import("monaco-editor").editor.IEditorDecorationsCollection | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSteps = frames.length;
  const frame = frames[stepIndex] || null;

  useEffect(() => {
    if (frame && editorRef.current && monacoRef.current) {
      const line = frame.line;
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.revealLineInCenter(line);

      if (decorationsRef.current) {
        decorationsRef.current.clear();
      }
      decorationsRef.current = editorRef.current.createDecorationsCollection([
        {
          range: new monacoRef.current.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: "bg-amber-400/20",
            overviewRuler: { color: "#f59e0b", position: 1 },
          },
        },
      ]);
    }
  }, [frame]);

  useEffect(() => {
    if (!playing || totalSteps === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setStepIndex((i) => {
        const next = Math.min(totalSteps - 1, i + 1);
        if (next >= totalSteps - 1) {
          setPlaying(false);
        }
        return next;
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, totalSteps]);

  function resetTrace() {
    setFrames([]);
    setStepIndex(0);
    setPlaying(false);
    setError(null);
    if (decorationsRef.current) {
      decorationsRef.current.clear();
      decorationsRef.current = null;
    }
  }

  function handleProblemChange(id: string) {
    const p = realProblems.find((x) => x.id === id);
    if (!p) return;
    setProblem(p);
    setLanguage(p.language);
    setCode(starterForProblem(p, p.language));
    resetTrace();
  }

  function handleLanguageChange(next: SupportedLanguage) {
    setLanguage(next);
    setCode(starterForProblem(problem, next));
    resetTrace();
  }

  function handleRun() {
    resetTrace();
    const result = runProblem({ ...problem, starterCode: code, language });
    if (result.ok) {
      setFrames(result.frames);
      setStepIndex(0);
    } else {
      setError(result.error);
    }
  }

  function handleEditorMount(
    editor: import("monaco-editor").editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor")
  ) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: "on",
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 8,
      lineNumbersMinChars: 3,
      renderLineHighlight: "all",
    });
  }

  const status =
    error ? "Error" :
    frames.length === 0 ? "Ready" :
    playing ? "Running" :
    stepIndex >= frames.length - 1 ? "Finished" : "Paused";

  const statusColor =
    error ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900" :
    status === "Running" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900" :
    status === "Finished" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900" :
    "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-zinc-50 dark:bg-zinc-950">
      {/* Top toolbar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 px-4 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-indigo-500" />
          <span className="hidden sm:block font-semibold text-sm">Trace Playground</span>
        </div>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

        <div className="relative">
          <select
            value={problem.id}
            onChange={(e) => handleProblemChange(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-background px-3 pr-9 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {realProblems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        </div>

        <div className="relative">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
            className="h-9 appearance-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-background px-3 pr-9 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        </div>

        <div className="flex-1" />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={!frames.length || stepIndex <= 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 text-xs font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <SkipBack size={14} /> <span className="hidden sm:inline">Back</span>
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={!frames.length}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => setStepIndex((i) => Math.min(frames.length - 1, i + 1))}
            disabled={!frames.length || stepIndex >= frames.length - 1}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 text-xs font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <span className="hidden sm:inline">Forward</span> <SkipForward size={14} />
          </button>
          <button
            onClick={() => {
              setStepIndex(0);
              setPlaying(false);
            }}
            disabled={!frames.length}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 text-xs font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <RotateCcw size={14} /> <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={handleRun}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={14} /> Run
          </button>

          <div className="hidden md:flex items-center gap-2 ml-1 pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500">Speed</span>
            <input
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={100}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-20 accent-indigo-500"
            />
            <span className="text-[11px] text-zinc-500 w-16 text-right">
              {frames.length ? stepIndex + 1 : 0} / {frames.length}
            </span>
          </div>

          <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${playing ? "bg-emerald-500 animate-pulse" : error ? "bg-red-500" : status === "Finished" ? "bg-indigo-500" : "bg-zinc-400"}`} />
            {status}
          </span>
        </div>
      </div>

      {/* Workbench */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr_420px]">
        <aside className="border-r border-zinc-200 dark:border-zinc-800 overflow-auto p-4 bg-white dark:bg-zinc-900">
          <h2 className="text-base font-semibold">{problem.name}</h2>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">
              {problem.difficulty}
            </span>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">
              {problem.category}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {problem.description}
          </p>

          {problem.constraints && (
            <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Constraints</h3>
              <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">{problem.constraints}</p>
            </div>
          )}

          <div className="mt-3 space-y-2">
            <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Examples</h3>
            {problem.examples.map((ex, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-xs">
                <p><span className="text-zinc-500">Input:</span> {ex.input}</p>
                <p className="mt-1"><span className="text-zinc-500">Output:</span> {ex.output}</p>
                {ex.explanation && <p className="mt-1 text-zinc-500">{ex.explanation}</p>}
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Input</h3>
            <pre className="mt-1 overflow-auto rounded bg-zinc-50 dark:bg-zinc-900 p-2 font-mono text-[11px]">
              {JSON.stringify(problem.input, null, 2)}
            </pre>
          </div>
        </aside>

        <section className="flex flex-col min-h-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={monacoLanguage(language)}
              value={code}
              theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
              onChange={(value) => setCode(value ?? "")}
              onMount={handleEditorMount}
              options={{
                automaticLayout: true,
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </section>

        <section className="overflow-auto min-h-0 bg-zinc-50/50 dark:bg-zinc-950/30">
          <Visualizer frame={frame} problem={problem} />
        </section>
      </div>

      {/* Bottom panel */}
      <div className="h-44 shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 px-3">
          <button
            onClick={() => setBottomTab("console")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              bottomTab === "console"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Terminal size={14} /> Console
          </button>
          <button
            onClick={() => setBottomTab("trace")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              bottomTab === "trace"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <List size={14} /> Trace
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3 text-xs font-mono">
          {bottomTab === "console" ? (
            <div className="space-y-2">
              {error ? (
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
              ) : frame ? (
                <>
                  {frame.note && (
                    <p className="text-zinc-700 dark:text-zinc-300">{frame.note}</p>
                  )}
                  {frame.output !== undefined && (
                    <p className="text-emerald-600 dark:text-emerald-400">Output: {JSON.stringify(frame.output)}</p>
                  )}
                  {!frame.note && frame.output === undefined && (
                    <p className="text-zinc-500">No output yet. Step through the trace to see values update.</p>
                  )}
                </>
              ) : (
                <p className="text-zinc-500">Press <strong>Run</strong> to start tracing this problem.</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {frames.length === 0 ? (
                <p className="text-zinc-500">No trace generated yet.</p>
              ) : (
                frames.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setStepIndex(i);
                      setPlaying(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-start gap-2 ${
                      i === stepIndex
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <span className="shrink-0 text-[10px] text-zinc-400 w-12">{i + 1}/{frames.length}</span>
                    <span className="truncate">
                      line {f.line}: {f.note || "step"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
