"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { problems, type Problem, type Step } from "@/app/lib/tracer";

function formatValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  return JSON.stringify(v);
}

function CodePanel({ code, activeLine }: { code: string; activeLine: number }) {
  const lines = code.split("\n");
  return (
    <div className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 font-mono text-sm">
      <div className="flex flex-col">
        {lines.map((line, idx) => {
          const num = idx + 1;
          const isActive = activeLine === num;
          return (
            <div
              key={idx}
              className={`flex rounded ${isActive ? "bg-yellow-200/40 dark:bg-yellow-500/20" : ""}`}
            >
              <span className="w-8 shrink-0 select-none text-right text-zinc-400 pr-3">
                {num}
              </span>
              <pre className="whitespace-pre flex-1">{line || " "}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArrayPanel({ arrays }: { arrays: Step["arrays"] }) {
  if (!arrays || arrays.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {arrays.map((arr) => (
        <div key={arr.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-500 mb-3">{arr.label}</h3>
          <div className="flex items-end gap-1">
            {arr.values.map((value, idx) => {
              const pointers = arr.pointers.filter((p) => p.index === idx);
              const highlighted =
                arr.highlightRange &&
                idx >= arr.highlightRange[0] &&
                idx <= arr.highlightRange[1];
              return (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className="flex gap-0.5">
                    {pointers.map((p, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white"
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-sm font-medium ${
                      highlighted
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
                        : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {value}
                  </div>
                  <span className="text-[10px] text-zinc-400">{idx}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StackPanel({ stacks }: { stacks: Step["stacks"] }) {
  if (!stacks || stacks.length === 0) return null;
  return (
    <div className="flex gap-4">
      {stacks.map((stack) => (
        <div
          key={stack.id}
          className="flex min-h-[160px] flex-col-reverse items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3"
        >
          <span className="text-[10px] text-zinc-400 mb-2">{stack.label}</span>
          {stack.values.map((v, i) => (
            <div
              key={i}
              className={`flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm font-medium ${
                i === stack.values.length - 1
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {v}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function QueuePanel({ queues }: { queues: Step["queues"] }) {
  if (!queues || queues.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {queues.map((queue) => (
        <div key={queue.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-500 mb-3">{queue.label}</h3>
          <div className="flex items-center gap-2">
            {queue.values.length === 0 ? (
              <span className="text-sm italic text-zinc-400">empty</span>
            ) : (
              queue.values.map((v, i) => (
                <div
                  key={i}
                  className={`flex h-10 min-w-[2.5rem] items-center justify-center rounded-md border px-2 font-mono text-sm font-medium ${
                    i === 0
                      ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
                      : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {v}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TreePanel({ trees }: { trees: Step["trees"] }) {
  if (!trees || trees.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {trees.map((tree) => {
        const width =
          Math.max(...tree.nodes.map((n) => n.x || 0), 100) + 48;
        const height =
          Math.max(...tree.nodes.map((n) => n.y || 0), 80) + 48;
        return (
          <div
            key={tree.id}
            className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4"
          >
            <h3 className="text-sm font-medium text-zinc-500 mb-3">{tree.label}</h3>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
              {tree.nodes.map((node) => {
                const left = node.left !== undefined ? tree.nodes[node.left] : null;
                const right = node.right !== undefined ? tree.nodes[node.right] : null;
                return (
                  <g key={node.index}>
                    {left && (
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={left.x}
                        y2={left.y}
                        stroke="currentColor"
                        className="text-zinc-300 dark:text-zinc-700"
                      />
                    )}
                    {right && (
                      <line
                        x1={node.x}
                        y1={node.y}
                        x2={right.x}
                        y2={right.y}
                        stroke="currentColor"
                        className="text-zinc-300 dark:text-zinc-700"
                      />
                    )}
                  </g>
                );
              })}
              {tree.nodes.map((node) => {
                const isVisited = tree.visitedValues?.includes(node.index as number);
                return (
                  <g key={`node-${node.index}`}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={18}
                      className={`${
                        isVisited
                          ? "fill-indigo-500 stroke-indigo-600"
                          : "fill-zinc-100 stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-600"
                      }`}
                    />
                    <text
                      x={node.x}
                      y={node.y + 5}
                      textAnchor="middle"
                      className={`text-sm font-mono font-medium ${
                        isVisited ? "fill-white" : "fill-zinc-900 dark:fill-zinc-100"
                      }`}
                    >
                      {node.value}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function VariablesPanel({ variables }: { variables: Step["variables"] }) {
  const entries = Object.entries(variables || {});
  if (entries.length === 0) return null;
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-medium text-zinc-500 mb-3">Variables</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {entries.map(([name, value]) => (
          <div
            key={name}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2"
          >
            <span className="block text-xs text-zinc-500">{name}</span>
            <span className="block truncate font-mono text-sm">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Playground() {
  const [problem, setProblem] = useState<Problem>(problems[0]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const steps = useMemo(() => problem.run(), [problem]);
  const safeIndex = Math.min(index, Math.max(0, steps.length - 1));
  const step = steps[safeIndex] || null;

  const indexRef = useRef(index);
  const stepsRef = useRef(steps);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    if (!playing) return;

    const id = setInterval(() => {
      const nextIndex = Math.min(
        indexRef.current + 1,
        stepsRef.current.length - 1
      );
      if (nextIndex === indexRef.current) {
        setPlaying(false);
      } else {
        setIndex(nextIndex);
      }
    }, 900);

    return () => clearInterval(id);
  }, [playing]);

  const reset = () => {
    setPlaying(false);
    setIndex(0);
  };

  const activeLine = step ? step.line : 0;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trace Playground</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Step through an algorithm and watch its state change in real time.
          </p>
        </div>

        <div className="relative">
          <select
            value={problem.id}
            onChange={(e) => {
              const p = problems.find((x) => x.id === e.target.value);
              if (p) {
                setProblem(p);
                setIndex(0);
                setPlaying(false);
              }
            }}
            className="h-11 w-full appearance-none rounded-lg border border-zinc-300 dark:border-zinc-700 bg-background px-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index <= 0}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          <SkipBack size={16} /> Prev
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
          disabled={index >= steps.length - 1}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          Next <SkipForward size={16} />
        </button>
        <button
          onClick={reset}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
        >
          <RotateCcw size={16} /> Reset
        </button>
        <span className="ml-auto text-sm text-zinc-500">
          Step {safeIndex + 1} / {steps.length}
        </span>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-2">
        <CodePanel code={problem.code} activeLine={activeLine} />

        <div className="flex flex-col gap-4">
          {step && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-4">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                {step.note}
              </p>
            </div>
          )}

          <VariablesPanel variables={step?.variables || {}} />

          <div className="grid gap-4 sm:grid-cols-2">
            <ArrayPanel arrays={step?.arrays} />
            <StackPanel stacks={step?.stacks} />
            <QueuePanel queues={step?.queues} />
          </div>

          <TreePanel trees={step?.trees} />

          {step?.output && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
              <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Output
              </h3>
              <pre className="font-mono text-sm">{step.output}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
