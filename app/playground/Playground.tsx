"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronDown, AlertCircle } from "lucide-react";
import { realProblems } from "@/app/lib/tracer/problems";
import { runProblem } from "@/app/lib/tracer/runner";
import type { RealProblem, TraceFrame } from "@/app/lib/tracer/types";
import { Visualizer } from "./Visualizer";

const MIN_SPEED = 200;
const MAX_SPEED = 2000;

export function Playground() {
  const { resolvedTheme } = useTheme();
  const [problem, setProblem] = useState<RealProblem>(realProblems[0]);
  const [code, setCode] = useState(problem.starterCode);
  const [frames, setFrames] = useState<TraceFrame[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [error, setError] = useState<string | null>(null);

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
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setStepIndex((i) => {
        if (i >= totalSteps - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
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

  function handleRun() {
    resetTrace();
    const result = runProblem({ ...problem, starterCode: code });
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

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight hidden sm:block">Trace Playground</h1>
          <div className="relative">
            <select
              value={problem.id}
              onChange={(e) => {
                const p = realProblems.find((x) => x.id === e.target.value);
                if (p) {
                  setProblem(p);
                  setCode(p.starterCode);
                  resetTrace();
                }
              }}
              className="h-10 appearance-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-background px-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {realProblems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={!frames.length || stepIndex <= 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <SkipBack size={16} /> <span className="hidden sm:inline">Back</span>
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={!frames.length}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => setStepIndex((i) => Math.min(frames.length - 1, i + 1))}
            disabled={!frames.length || stepIndex >= frames.length - 1}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <span className="hidden sm:inline">Forward</span> <SkipForward size={16} />
          </button>
          <button
            onClick={() => {
              setStepIndex(0);
              setPlaying(false);
            }}
            disabled={!frames.length}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <RotateCcw size={16} /> <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={handleRun}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Run
          </button>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-zinc-500">{frames.length ? stepIndex + 1 : 0} / {frames.length}</span>
            <input
              type="range"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={100}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>
      </div>

      <div className="grid flex-1 min-h-0 lg:grid-cols-[320px_1fr_420px]">
        <aside className="border-r border-zinc-200 dark:border-zinc-800 overflow-auto p-4">
          <h2 className="text-lg font-semibold">{problem.name}</h2>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">
              {problem.difficulty}
            </span>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">
              {problem.category}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {problem.description}
          </p>

          {problem.constraints && (
            <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Constraints</h3>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{problem.constraints}</p>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Examples</h3>
            {problem.examples.map((ex, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-sm">
                <p><span className="text-zinc-500">Input:</span> {ex.input}</p>
                <p className="mt-1"><span className="text-zinc-500">Output:</span> {ex.output}</p>
                {ex.explanation && <p className="mt-1 text-zinc-500">{ex.explanation}</p>}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Input</h3>
            <pre className="mt-1 overflow-auto rounded bg-zinc-50 dark:bg-zinc-900 p-2 font-mono text-xs">
              {JSON.stringify(problem.input, null, 2)}
            </pre>
          </div>
        </aside>

        <section className="flex flex-col min-h-0 border-r border-zinc-200 dark:border-zinc-800">
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              defaultLanguage="javascript"
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
          {error && (
            <div className="border-t border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <pre className="font-mono whitespace-pre-wrap">{error}</pre>
            </div>
          )}
        </section>

        <section className="overflow-auto min-h-0 bg-zinc-50/50 dark:bg-zinc-950/30">
          <Visualizer frame={frame} problem={problem} />
        </section>
      </div>
    </div>
  );
}
