export type VarValue = string | number | boolean | null | undefined | unknown[] | Record<string, unknown>;

export type TraceEvent =
  | { type: "line"; line: number }
  | { type: "variable-create"; name: string; value: unknown; line: number }
  | { type: "variable-change"; name: string; previousValue: unknown; newValue: unknown; line: number }
  | { type: "array-change"; name: string; indices: (number | string)[]; previousValue: unknown; newValue: unknown; line: number; kind?: "set" | "push" | "pop" | "shift" | "unshift" }
  | { type: "array-read"; name: string; indices: (number | string)[]; value: unknown; line: number }
  | { type: "loop"; kind: string; line: number }
  | { type: "call"; name: string; line: number }
  | { type: "return"; value: unknown; line: number }
  | { type: "output"; value: unknown };

export type ArrayState = { values: unknown[] };
export type GridState = { values: unknown[][] };

export type CellChange = {
  name: string;
  indices: (number | string)[];
  previousValue: unknown;
  newValue: unknown;
};

export type CellDependency = {
  name: string;
  indices: (number | string)[];
  value: unknown;
};

export type TraceFrame = {
  step: number;
  line: number;
  note?: string;
  variables: Record<string, unknown>;
  arrays: Record<string, ArrayState>;
  grids: Record<string, GridState>;
  changed?: CellChange;
  dependencies?: CellDependency[];
  output?: unknown;
};

export type RealProblem = {
  id: string;
  name: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints?: string;
  starterCode: string;
  language: "javascript";
  input: Record<string, unknown>;
};

// Backward-compatible alias
export type Problem = RealProblem;

export type RunResult =
  | { ok: true; frames: TraceFrame[]; output?: unknown }
  | { ok: false; error: string };
