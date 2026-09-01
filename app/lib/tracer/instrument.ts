import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

const TRACE = "__alv_trace";
const DECLARE = "__alv_declare";
const CHANGE = "__alv_change";
const ARRAY_SET = "__alv_arraySet";
const ARRAY_GET = "__alv_arrayGet";
const GRID_SET = "__alv_gridSet";
const GRID_GET = "__alv_gridGet";
const ARRAY_PUSH = "__alv_arrayPush";
const ARRAY_POP = "__alv_arrayPop";
const ARRAY_SHIFT = "__alv_arrayShift";
const ARRAY_UNSHIFT = "__alv_arrayUnshift";
const OBJ_GET = "__alv_objGet";
const OBJ_SET = "__alv_objSet";
const RETURN = "__alv_return";
const CHECK_TIME = "__alv_checkTime";

function lineOf(node: t.Node): number {
  return node.loc?.start.line ?? 1;
}

function makeTrace(type: string, props: [string, t.Expression][], line: number): t.CallExpression {
  const properties: t.ObjectProperty[] = [
    t.objectProperty(t.identifier("type"), t.stringLiteral(type)),
    t.objectProperty(t.identifier("line"), t.numericLiteral(line)),
  ];
  for (const [key, value] of props) {
    properties.push(t.objectProperty(t.identifier(key), value));
  }
  return t.callExpression(t.identifier(TRACE), [t.objectExpression(properties)]);
}

function makeHelper(name: string, args: t.Expression[]): t.CallExpression {
  return t.callExpression(t.identifier(name), args);
}

type MemberChain = {
  base: t.Identifier;
  indices: t.Expression[];
  node: t.MemberExpression;
};

function analyzeMember(node: t.MemberExpression): MemberChain | null {
  const indices: t.Expression[] = [];
  let current: t.Expression = node;

  while (t.isMemberExpression(current)) {
    if (!current.computed) return null;
    const prop = current.property;
    if (t.isExpression(prop)) {
      indices.unshift(prop);
    } else {
      return null;
    }
    current = current.object;
  }

  if (!t.isIdentifier(current)) return null;
  return { base: current, indices, node };
}

function isAssignmentLeft(path: NodePath): boolean {
  const parent = path.parentPath;
  if (!parent) return false;
  if (parent.isAssignmentExpression() && parent.node.left === path.node) return true;
  if (parent.isUpdateExpression() && parent.node.argument === path.node) return true;
  return false;
}

function isInsideMemberChain(path: NodePath<t.MemberExpression>): boolean {
  return path.parentPath?.isMemberExpression() ?? false;
}

function isCallCallee(path: NodePath<t.MemberExpression>): boolean {
  return path.parentPath?.isCallExpression() && path.parentPath.node.callee === path.node;
}

function isInstrumentationNode(node: t.Statement): boolean {
  if (!t.isExpressionStatement(node)) return false;
  const expr = node.expression;
  if (!t.isCallExpression(expr)) return false;
  const callee = expr.callee;
  return t.isIdentifier(callee) && callee.name.startsWith("__alv");
}

export function instrument(code: string): { ok: true; code: string } | { ok: false; error: string } {
  try {
    const ast = parse(code, {
      sourceType: "script",
      allowReturnOutsideFunction: true,
      allowUndeclaredExports: false,
    });

    traverse(ast, {
      // Line traces at the start of every statement
      Statement(path) {
        if (isInstrumentationNode(path.node)) return;
        if (path.isBlockStatement()) return;
        if (path.isVariableDeclaration()) {
          // handled by VariableDeclarator
          return;
        }
        if (path.isFunctionDeclaration()) return; // body will be traced

        const line = lineOf(path.node);
        const trace = makeTrace("line", [], line);
        path.insertBefore(t.expressionStatement(trace));
      },

      VariableDeclarator(path) {
        const node = path.node;
        const id = node.id;
        if (!t.isIdentifier(id)) return;
        const line = lineOf(node);

        node.init = makeHelper(DECLARE, [
          t.stringLiteral(id.name),
          node.init ?? t.identifier("undefined"),
          t.numericLiteral(line),
        ]);
      },

      AssignmentExpression(path) {
        const node = path.node;
        const line = lineOf(node);

        if (t.isIdentifier(node.left)) {
          const name = node.left.name;
          const op = node.operator;

          if (op === "=") {
            node.right = makeHelper(CHANGE, [
              t.stringLiteral(name),
              t.identifier(name),
              node.right,
              t.numericLiteral(line),
            ]);
          } else {
            const rightExpr = (() => {
              const left = t.identifier(name);
              const right = node.right;
              switch (op) {
                case "+=":
                  return t.binaryExpression("+", left, right);
                case "-=":
                  return t.binaryExpression("-", left, right);
                case "*=":
                  return t.binaryExpression("*", left, right);
                case "/=":
                  return t.binaryExpression("/", left, right);
                case "%=":
                  return t.binaryExpression("%", left, right);
                default:
                  return right;
              }
            })();
            node.right = makeHelper(CHANGE, [
              t.stringLiteral(name),
              t.identifier(name),
              rightExpr,
              t.numericLiteral(line),
            ]);
            node.operator = "=";
          }
          return;
        }

        if (t.isMemberExpression(node.left)) {
          const chain = analyzeMember(node.left);
          if (chain) {
            const { base, indices } = chain;
            const isCompound = node.operator !== "=";
            const leftValueExpr: t.Expression =
              indices.length === 1
                ? makeHelper(ARRAY_GET, [t.identifier(base.name), indices[0], t.stringLiteral(base.name), t.numericLiteral(line)])
                : makeHelper(GRID_GET, [t.identifier(base.name), indices[0], indices[1], t.stringLiteral(base.name), t.numericLiteral(line)]);

            const op = ({
              "+=": "+",
              "-=": "-",
              "*=": "*",
              "/=": "/",
              "%=": "%",
            } as Record<string, t.BinaryExpression["operator"]>)[node.operator] ?? "+";

            const newValueExpr: t.Expression = isCompound
              ? t.binaryExpression(op, leftValueExpr, node.right)
              : node.right;
            node.operator = "=";

            if (indices.length === 1) {
              node.right = makeHelper(ARRAY_SET, [
                t.identifier(base.name),
                indices[0],
                newValueExpr,
                t.stringLiteral(base.name),
                t.numericLiteral(line),
              ]);
            } else if (indices.length === 2) {
              node.right = makeHelper(GRID_SET, [
                t.identifier(base.name),
                indices[0],
                indices[1],
                newValueExpr,
                t.stringLiteral(base.name),
                t.numericLiteral(line),
              ]);
            }
            return;
          }

          // Non-computed object property assignment: obj.prop = value
          if (!node.left.computed && t.isIdentifier(node.left.object) && t.isIdentifier(node.left.property)) {
            const objName = node.left.object.name;
            const propName = node.left.property.name;
            node.right = makeHelper(OBJ_SET, [
              t.identifier(objName),
              t.stringLiteral(propName),
              node.right,
              t.stringLiteral(objName),
              t.numericLiteral(line),
            ]);
          }
        }
      },

      UpdateExpression(path) {
        const node = path.node;
        const line = lineOf(node);
        const arg = node.argument;
        if (!t.isIdentifier(arg)) return;

        const name = arg.name;
        const delta = node.operator === "++" ? 1 : -1;
        const isPrefix = node.prefix;

        const newValueExpr =
          delta === 1
            ? t.binaryExpression("+", t.identifier(name), t.numericLiteral(1))
            : t.binaryExpression("-", t.identifier(name), t.numericLiteral(1));
        const assign = t.assignmentExpression(
          "=",
          t.identifier(name),
          makeHelper(CHANGE, [
            t.stringLiteral(name),
            t.identifier(name),
            newValueExpr,
            t.numericLiteral(line),
          ])
        );

        if (isPrefix) {
          path.replaceWith(assign);
        } else {
          // postfix: perform the change, then return the previous value
          const oldValueExpr =
            delta === 1
              ? t.binaryExpression("-", t.identifier(name), t.numericLiteral(1))
              : t.binaryExpression("+", t.identifier(name), t.numericLiteral(1));
          path.replaceWith(t.sequenceExpression([assign, oldValueExpr]));
        }
        path.skip();
      },

      MemberExpression(path) {
        if (isAssignmentLeft(path)) return;
        if (isInsideMemberChain(path)) return;
        if (isCallCallee(path)) return;

        const chain = analyzeMember(path.node);
        if (chain) {
          const { base, indices } = chain;
          if (indices.length === 1) {
            path.replaceWith(
              makeHelper(ARRAY_GET, [
                t.identifier(base.name),
                indices[0],
                t.stringLiteral(base.name),
                t.numericLiteral(lineOf(path.node)),
              ])
            );
          } else if (indices.length === 2) {
            path.replaceWith(
              makeHelper(GRID_GET, [
                t.identifier(base.name),
                indices[0],
                indices[1],
                t.stringLiteral(base.name),
                t.numericLiteral(lineOf(path.node)),
              ])
            );
          }
          return;
        }

        // Non-computed object property read: obj.prop
        const node = path.node;
        if (!node.computed && t.isIdentifier(node.object) && t.isIdentifier(node.property)) {
          path.replaceWith(
            makeHelper(OBJ_GET, [
              t.identifier(node.object.name),
              t.stringLiteral(node.property.name),
              t.stringLiteral(node.object.name),
              t.numericLiteral(lineOf(node)),
            ])
          );
        }
      },

      Loop(path) {
        const line = lineOf(path.node);
        const check = t.expressionStatement(t.callExpression(t.identifier(CHECK_TIME), []));
        const trace = makeTrace("loop", [["kind", t.stringLiteral(path.node.type)]], line);
        const body = path.node.body;
        if (t.isBlockStatement(body)) {
          body.body.unshift(check, t.expressionStatement(trace));
        } else {
          path.node.body = t.blockStatement([check, t.expressionStatement(trace), body]);
        }
      },

      CallExpression(path) {
        const node = path.node;
        const line = lineOf(node);

        // Skip our own instrumentation helpers.
        if (t.isIdentifier(node.callee) && node.callee.name.startsWith("__alv")) return;

        // arr.push(x), arr.pop(), arr.shift(), arr.unshift(x)
        if (
          t.isMemberExpression(node.callee) &&
          !node.callee.computed &&
          t.isIdentifier(node.callee.object) &&
          t.isIdentifier(node.callee.property)
        ) {
          const base = node.callee.object.name;
          const method = node.callee.property.name;

          if (method === "push" && node.arguments.length >= 1) {
            // push only one arg for now; extra args are dropped.
            const arg0 = node.arguments[0];
            if (!t.isExpression(arg0)) return;
            path.replaceWith(
              makeHelper(ARRAY_PUSH, [
                t.identifier(base),
                arg0,
                t.stringLiteral(base),
                t.numericLiteral(line),
              ])
            );
            path.skip();
            return;
          }

          if (method === "pop" && node.arguments.length === 0) {
            path.replaceWith(makeHelper(ARRAY_POP, [t.identifier(base), t.stringLiteral(base), t.numericLiteral(line)]));
            path.skip();
            return;
          }

          if (method === "shift" && node.arguments.length === 0) {
            path.replaceWith(makeHelper(ARRAY_SHIFT, [t.identifier(base), t.stringLiteral(base), t.numericLiteral(line)]));
            path.skip();
            return;
          }

          if (method === "unshift" && node.arguments.length >= 1) {
            const arg0 = node.arguments[0];
            if (!t.isExpression(arg0)) return;
            path.replaceWith(
              makeHelper(ARRAY_UNSHIFT, [
                t.identifier(base),
                arg0,
                t.stringLiteral(base),
                t.numericLiteral(line),
              ])
            );
            path.skip();
            return;
          }
        }
      },

      ReturnStatement(path) {
        const node = path.node;
        const line = lineOf(node);
        const arg = node.argument ?? t.identifier("undefined");
        node.argument = makeHelper(RETURN, [arg, t.numericLiteral(line)]);
      },
    });

    const output = generate(ast as t.Node, { compact: true });
    return { ok: true, code: output.code };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    return { ok: false, error: `${message}\n${stack}` };
  }
}
