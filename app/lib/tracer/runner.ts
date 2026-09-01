import type { TraceEvent, TraceFrame, RunResult, Problem } from "./types";
import { instrument } from "./instrument";

function deepClone<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function classifyValue(name: string, value: unknown): { variables?: unknown; arrays?: Record<string, { values: unknown[] }>; grids?: Record<string, { values: unknown[][] }> } {
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return { grids: { [name]: { values: value as unknown[][] } } };
    }
    return { arrays: { [name]: { values: value as unknown[] } } };
  }
  return { variables: value };
}

function applyArrayChange(
  state: Map<string, unknown>,
  name: string,
  indices: (number | string)[],
  newValue: unknown,
  kind: "set" | "push" | "pop" | "shift" | "unshift" = "set"
) {
  const target = state.get(name);

  if (kind === "push" || kind === "pop" || kind === "shift" || kind === "unshift") {
    if (!Array.isArray(target)) return;
    if (kind === "push") {
      target.push(newValue);
    } else if (kind === "pop") {
      target.pop();
    } else if (kind === "shift") {
      target.shift();
    } else if (kind === "unshift") {
      target.unshift(newValue);
    }
    return;
  }

  if (!Array.isArray(target)) return;
  let arr: unknown = target;
  for (let i = 0; i < indices.length - 1; i++) {
    const idx = Number(indices[i]);
    if (Number.isNaN(idx)) return;
    const next = (arr as unknown[])[idx];
    if (!Array.isArray(next)) return;
    arr = next;
  }
  const lastIdx = Number(indices[indices.length - 1]);
  if (Number.isNaN(lastIdx)) return;
  (arr as unknown[])[lastIdx] = newValue;
}

function buildFrames(events: TraceEvent[], initialState: Record<string, unknown> = {}): TraceFrame[] {
  const variables = new Map<string, unknown>(Object.entries(initialState).map(([k, v]) => [k, deepClone(v)]));
  const frames: TraceFrame[] = [];
  let currentLine = 1;
  const pendingReads: { name: string; indices: (number | string)[]; value: unknown }[] = [];

  function snapshot(line: number, note?: string, changed?: TraceFrame["changed"]) {
    const vars: Record<string, unknown> = {};
    const arrays: Record<string, { values: unknown[] }> = {};
    const grids: Record<string, { values: unknown[][] }> = {};

    for (const [name, value] of variables) {
      const cloned = deepClone(value);
      const classified = classifyValue(name, cloned);
      if (classified.variables !== undefined) vars[name] = classified.variables;
      if (classified.arrays) Object.assign(arrays, classified.arrays);
      if (classified.grids) Object.assign(grids, classified.grids);
    }

    frames.push({
      step: frames.length,
      line,
      note,
      variables: vars,
      arrays,
      grids,
      changed,
      dependencies: pendingReads.length > 0 ? [...pendingReads] : undefined,
    });
    pendingReads.length = 0;
  }

  for (const event of events) {
    switch (event.type) {
      case "line":
        currentLine = event.line;
        break;

      case "loop":
      case "call":
        currentLine = event.line;
        break;

      case "variable-create": {
        variables.set(event.name, event.value);
        const note = `${event.name}:  → ${JSON.stringify(event.value)}`;
        snapshot(currentLine, note, {
          name: event.name,
          indices: [],
          previousValue: undefined,
          newValue: event.value,
        });
        break;
      }

      case "variable-change": {
        variables.set(event.name, event.newValue);
        const note = `${event.name}: ${JSON.stringify(event.previousValue)} → ${JSON.stringify(event.newValue)}`;
        snapshot(currentLine, note, {
          name: event.name,
          indices: [],
          previousValue: event.previousValue,
          newValue: event.newValue,
        });
        break;
      }

      case "array-change": {
        applyArrayChange(variables, event.name, event.indices, event.newValue, event.kind ?? "set");
        const kindLabel = event.kind ? ` (${event.kind})` : "";
        snapshot(currentLine, `${event.name}[${event.indices.join(",")}]${kindLabel} = ${JSON.stringify(event.newValue)}`, {
          name: event.name,
          indices: event.indices,
          previousValue: event.previousValue,
          newValue: event.newValue,
        });
        break;
      }

      case "array-read": {
        pendingReads.push({ name: event.name, indices: event.indices, value: event.value });
        break;
      }

      case "return":
      case "output": {
        snapshot(currentLine, `return ${JSON.stringify(event.value)}`, undefined);
        break;
      }
    }
  }

  return frames;
}

export function runProblem(problem: Problem): RunResult {
  const instrumented = instrument(problem.starterCode);
  if (!instrumented.ok) {
    return { ok: false, error: `Syntax error: ${instrumented.error}` };
  }

  const events: TraceEvent[] = [];
  const start = Date.now();

  function checkTime() {
    if (Date.now() - start > 5000) {
      throw new Error("Execution timeout (5s)");
    }
  }

  function trace(event: TraceEvent) {
    events.push(event);
  }

  function declare(name: string, value: unknown, line: number) {
    trace({ type: "variable-create", name, value: deepClone(value), line });
    return value;
  }

  function change(name: string, previousValue: unknown, newValue: unknown, line: number) {
    trace({ type: "variable-change", name, previousValue: deepClone(previousValue), newValue: deepClone(newValue), line });
    return newValue;
  }

  function traceReturn(value: unknown, line: number) {
    trace({ type: "return", value: deepClone(value), line });
    return value;
  }

  function arraySet(array: unknown[], index: number | string, newValue: unknown, name: string, line: number) {
    const i = typeof index === "number" ? index : Number(index);
    if (Number.isNaN(i)) return newValue;
    const previousValue = deepClone(array[i]);
    array[i] = newValue;
    trace({ type: "array-change", name, indices: [index], previousValue, newValue: deepClone(newValue), line });
    return newValue;
  }

  function arrayGet(array: unknown[], index: number | string, name: string, line: number) {
    const i = typeof index === "number" ? index : Number(index);
    if (Number.isNaN(i)) return undefined;
    const value = array[i];
    trace({ type: "array-read", name, indices: [index], value: deepClone(value), line });
    return value;
  }

  function gridSet(array: unknown[][], row: number, col: number, newValue: unknown, name: string, line: number) {
    const previousValue = deepClone(array[row][col]);
    array[row][col] = newValue;
    trace({ type: "array-change", name, indices: [row, col], previousValue, newValue: deepClone(newValue), line });
    return newValue;
  }

  function gridGet(array: unknown[][], row: number, col: number, name: string, line: number) {
    const value = array[row][col];
    trace({ type: "array-read", name, indices: [row, col], value: deepClone(value), line });
    return value;
  }

  function arrayPush(array: unknown[], value: unknown, name: string, line: number) {
    const index = array.length;
    array.push(value);
    trace({ type: "array-change", name, indices: [index], previousValue: undefined, newValue: deepClone(value), line, kind: "push" });
    return array.length;
  }

  function arrayPop(array: unknown[], name: string, line: number) {
    const index = array.length - 1;
    const value = array[index];
    array.pop();
    trace({ type: "array-change", name, indices: [index], previousValue: deepClone(value), newValue: undefined, line, kind: "pop" });
    return value;
  }

  function arrayShift(array: unknown[], name: string, line: number) {
    const oldFirst = deepClone(array[0]);
    array.shift();
    const newFirst = deepClone(array[0]);
    trace({ type: "array-change", name, indices: [0], previousValue: oldFirst, newValue: newFirst, line, kind: "shift" });
    return oldFirst;
  }

  function arrayUnshift(array: unknown[], value: unknown, name: string, line: number) {
    array.unshift(value);
    trace({ type: "array-change", name, indices: [0], previousValue: undefined, newValue: deepClone(value), line, kind: "unshift" });
    return array.length;
  }

  function objGet(obj: Record<string, unknown>, prop: string, name: string, line: number) {
    const value = obj[prop];
    trace({ type: "array-read", name, indices: [prop], value: deepClone(value), line });
    return value;
  }

  function objSet(obj: Record<string, unknown>, prop: string, value: unknown, name: string, line: number) {
    const previousValue = deepClone(obj[prop]);
    obj[prop] = value;
    trace({ type: "array-change", name, indices: [prop], previousValue, newValue: deepClone(value), line });
    return value;
  }

  const inputKeys = Object.keys(problem.input);
  const paramNames = ["__alv_trace", "__alv_declare", "__alv_change", "__alv_arraySet", "__alv_arrayGet", "__alv_gridSet", "__alv_gridGet", "__alv_arrayPush", "__alv_arrayPop", "__alv_arrayShift", "__alv_arrayUnshift", "__alv_objGet", "__alv_objSet", "__alv_return", "__alv_checkTime", ...inputKeys];
  const paramValues = [trace, declare, change, arraySet, arrayGet, gridSet, gridGet, arrayPush, arrayPop, arrayShift, arrayUnshift, objGet, objSet, traceReturn, checkTime, ...Object.values(problem.input)];

  try {
    const fn = new Function(...paramNames, instrumented.code);
    const result = fn(...paramValues);
    const frames = buildFrames(events, problem.input);
    return { ok: true, frames, output: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Runtime error: ${message}` };
  }
}
