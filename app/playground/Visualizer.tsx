"use client";

import type { RealProblem, TraceFrame } from "@/app/lib/tracer/types";

type TreeInput = {
  val: unknown;
  left: TreeInput | null;
  right: TreeInput | null;
} | null;

type TreeNodeLayout = {
  val: unknown;
  x: number;
  y: number;
  left: number | null;
  right: number | null;
};

function formatCell(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undef";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("val" in obj) return String(obj.val);
    if (Array.isArray(value)) return `[${value.map(formatCell).join(", ")}]`;
    return JSON.stringify(value);
  }
  return String(value);
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  return JSON.stringify(value);
}

function layoutTree(root: TreeInput): TreeNodeLayout[] | null {
  if (!root) return null;

  const nodes: {
    val: unknown;
    left: number | null;
    right: number | null;
    x: number;
    y: number;
  }[] = [];

  function traverse(node: TreeInput): number {
    const id = nodes.length;
    nodes.push({ val: node!.val, left: null, right: null, x: 0, y: 0 });
    if (node!.left !== null) {
      nodes[id].left = traverse(node!.left);
    }
    if (node!.right !== null) {
      nodes[id].right = traverse(node!.right);
    }
    return id;
  }

  traverse(root);

  function setPositions(id: number, x: number, y: number, spread: number): number {
    const node = nodes[id];
    let currentX = x;
    if (node.left !== null) {
      currentX = setPositions(node.left, x, y + 70, spread / 2);
    }
    const ownX = node.left !== null || node.right !== null ? currentX + spread : x;
    if (node.right !== null) {
      setPositions(node.right, ownX + spread, y + 70, spread / 2);
    }
    node.x = ownX;
    node.y = y;
    return Math.max(ownX, currentX);
  }

  setPositions(0, 0, 30, 80);

  // Center the tree by offsetting all x values by half the max x
  const maxX = Math.max(...nodes.map((n) => n.x), 0);
  for (const node of nodes) {
    node.x += maxX / 2 + 30;
  }

  return nodes;
}

function getTreeRoot(frame: TraceFrame): TreeInput {
  if (frame.variables.root && typeof frame.variables.root === "object") {
    return frame.variables.root as TreeInput;
  }
  if (frame.variables.node && typeof frame.variables.node === "object") {
    return frame.variables.node as TreeInput;
  }
  return null;
}

function getPointers(frame: TraceFrame, name: string, length: number): { label: string; index: number }[] {
  const pointers: { label: string; index: number }[] = [];
  for (const [varName, value] of Object.entries(frame.variables)) {
    if (typeof value === "number" && value >= 0 && value < length) {
      if (["left", "right", "i", "j", "r", "c"].includes(varName)) {
        pointers.push({ label: varName, index: value });
      }
    }
  }
  return pointers;
}

function getHighlightIndices(frame: TraceFrame, name: string): { index: number; kind: "current" | "dependency" }[] {
  const indices: Map<number, { index: number; kind: "current" | "dependency" }> = new Map();

  if (frame.changed && frame.changed.name === name && frame.changed.indices.length === 1) {
    const idx = Number(frame.changed.indices[0]);
    if (!Number.isNaN(idx)) indices.set(idx, { index: idx, kind: "current" });
  }

  if (frame.dependencies) {
    for (const dep of frame.dependencies) {
      if (dep.name === name && dep.indices.length === 1) {
        const idx = Number(dep.indices[0]);
        if (!Number.isNaN(idx)) {
          const existing = indices.get(idx);
          if (!existing) {
            indices.set(idx, { index: idx, kind: "dependency" });
          }
        }
      }
    }
  }

  return Array.from(indices.values());
}

function ArrayView({ name, values, frame }: { name: string; values: unknown[]; frame: TraceFrame }) {
  const pointers = getPointers(frame, name, values.length);
  const highlights = getHighlightIndices(frame, name);
  const pointerMap = new Map(pointers.map((p) => [p.index, p]));
  const highlightMap = new Map(highlights.map((h) => [h.index, h]));

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-medium text-zinc-500 mb-3">{name}</h3>
      <div className="flex items-end gap-1 overflow-auto pb-2">
        {values.map((value, idx) => {
          const pointer = pointerMap.get(idx);
          const highlight = highlightMap.get(idx);
          const borderClass =
            highlight?.kind === "current"
              ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-100"
              : highlight?.kind === "dependency"
              ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-100"
              : "border-zinc-300 dark:border-zinc-700";
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              {pointer && (
                <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                  {pointer.label}
                </span>
              )}
              <div
                className={`flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border px-2 font-mono text-sm font-medium ${borderClass}`}
              >
                {formatCell(value)}
              </div>
              <span className="text-[10px] text-zinc-400">{idx}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StackView({ values, frame }: { values: unknown[]; frame: TraceFrame }) {
  const topIndex = values.length - 1;
  const highlights = getHighlightIndices(frame, "stack");
  const highlightMap = new Map(highlights.map((h) => [h.index, h]));

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-medium text-zinc-500 mb-3">stack</h3>
      <div className="flex min-h-[120px] flex-col-reverse items-center gap-1">
        {values.length === 0 ? (
          <span className="text-sm italic text-zinc-400">empty</span>
        ) : (
          values.map((value, idx) => {
            const isTop = idx === topIndex;
            const highlight = highlightMap.get(idx);
            return (
              <div
                key={idx}
                className={`flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border px-3 font-mono text-sm font-medium ${
                  isTop
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
                    : highlight
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-100"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {formatCell(value)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function QueueView({ values, frame }: { values: unknown[]; frame: TraceFrame }) {
  const highlights = getHighlightIndices(frame, "queue");
  const highlightMap = new Map(highlights.map((h) => [h.index, h]));

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-medium text-zinc-500 mb-3">queue</h3>
      <div className="flex items-center gap-2 overflow-auto pb-2">
        {values.length === 0 ? (
          <span className="text-sm italic text-zinc-400">empty</span>
        ) : (
          values.map((value, idx) => {
            const highlight = highlightMap.get(idx);
            return (
              <div
                key={idx}
                className={`flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border px-2 font-mono text-sm font-medium ${
                  idx === 0
                    ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-100"
                    : highlight
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-100"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {formatCell(value)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function GridView({ name, values, frame }: { name: string; values: unknown[][]; frame: TraceFrame }) {
  const current = frame.changed?.name === name && frame.changed.indices.length === 2
    ? { r: Number(frame.changed.indices[0]), c: Number(frame.changed.indices[1]) }
    : null;
  const deps = new Map<string, "dependency">();

  if (frame.dependencies) {
    for (const dep of frame.dependencies) {
      if (dep.name === name && dep.indices.length === 2) {
        deps.set(`${dep.indices[0]},${dep.indices[1]}`, "dependency");
      }
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 overflow-auto">
      <h3 className="text-sm font-medium text-zinc-500 mb-3">{name}</h3>
      <table className="border-collapse">
        <tbody>
          {values.map((row, r) => (
            <tr key={r}>
              {row.map((value, c) => {
                const isCurrent = current?.r === r && current?.c === c;
                const isDep = deps.has(`${r},${c}`);
                const cellClass = isCurrent
                  ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-100"
                  : isDep
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-100"
                  : "border-zinc-300 dark:border-zinc-700";
                return (
                  <td key={c} className="p-1">
                    <div
                      className={`flex h-10 w-12 items-center justify-center rounded-md border font-mono text-sm font-medium ${cellClass}`}
                    >
                      {formatCell(value)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {current && frame.changed && (
        <p className="mt-2 text-xs text-zinc-500">
          {name}[{current.r},{current.c}] = {formatCell(frame.changed.newValue)} (was {formatCell(frame.changed.previousValue)})
        </p>
      )}
    </div>
  );
}

function TreeView({ root }: { root: TreeInput }) {
  const nodes = layoutTree(root);
  if (!nodes || nodes.length === 0) return null;

  const maxX = Math.max(...nodes.map((n) => n.x), 0) + 40;
  const maxY = Math.max(...nodes.map((n) => n.y), 0) + 60;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 overflow-auto">
      <h3 className="text-sm font-medium text-zinc-500 mb-3">tree</h3>
      <svg width={maxX} height={maxY} viewBox={`0 0 ${maxX} ${maxY}`}>
        {nodes.map((node, i) => {
          const left = node.left !== null ? nodes[node.left] : null;
          const right = node.right !== null ? nodes[node.right] : null;
          return (
            <g key={`edge-${i}`}>
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
        {nodes.map((node, i) => (
          <g key={`node-${i}`}>
            <circle
              cx={node.x}
              cy={node.y}
              r={18}
              className="fill-zinc-100 stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-600"
            />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="fill-zinc-900 dark:fill-zinc-100 text-sm font-mono font-medium"
            >
              {formatCell(node.val)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function VariablesPanel({ variables }: { variables: Record<string, unknown> }) {
  const entries = Object.entries(variables || {});
  if (entries.length === 0) return null;
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-medium text-zinc-500 mb-3">Variables</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(([name, value]) => (
          <div key={name} className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
            <span className="block text-xs text-zinc-500">{name}</span>
            <span className="block truncate font-mono text-sm">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const VISUAL_SKIP: Record<string, string[]> = {
  "binary-tree-level-order": ["result"],
};

function shouldSkipVisual(problem: RealProblem, kind: "arrays" | "grids", name: string): boolean {
  return VISUAL_SKIP[problem.id]?.includes(name) ?? false;
}

export function Visualizer({ frame, problem }: { frame: TraceFrame | null; problem: RealProblem }) {
  if (!frame) {
    return (
      <div className="text-sm text-zinc-500 p-4">
        Press <strong>Run</strong> to generate a trace, then use the controls to step through.
      </div>
    );
  }

  const root = getTreeRoot(frame);

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto">
      {frame.note && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-4">
          <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{frame.note}</p>
        </div>
      )}

      <VariablesPanel variables={frame.variables} />

      {root && <TreeView root={root} />}

      {Object.entries(frame.grids)
        .filter(([name]) => !shouldSkipVisual(problem, "grids", name))
        .map(([name, grid]) => (
          <GridView key={name} name={name} values={grid.values} frame={frame} />
        ))}

      {Object.entries(frame.arrays)
        .filter(([name]) => !shouldSkipVisual(problem, "arrays", name))
        .map(([name, arr]) => {
          if (name === "stack") return <StackView key={name} values={arr.values} frame={frame} />;
          if (name === "queue") return <QueueView key={name} values={arr.values} frame={frame} />;
          return <ArrayView key={name} name={name} values={arr.values} frame={frame} />;
        })}

      {frame.output !== undefined && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
          <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Output</h3>
          <pre className="font-mono text-sm mt-1">{formatValue(frame.output)}</pre>
        </div>
      )}
    </div>
  );
}
