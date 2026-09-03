declare module "@babel/core" {
  export function transformSync(
    code: string,
    options?: Record<string, unknown>
  ): { code?: string | null; map?: unknown; ast?: unknown } | null;
}

declare module "@babel/preset-typescript" {
  const preset: unknown;
  export default preset;
}
