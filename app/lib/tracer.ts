export type VarValue = string | number | boolean | null | undefined | unknown[];

export type Pointer = {
  index: number;
  label: string;
  color?: string;
};

export type ArrayView = {
  id: string;
  label: string;
  values: number[];
  pointers: Pointer[];
  highlightRange?: [number, number];
};

export type StackView = {
  id: string;
  label: string;
  values: string[];
  topIndex?: number;
};

export type QueueView = {
  id: string;
  label: string;
  values: number[];
};

export type TreeView = {
  id: string;
  label: string;
  nodes: TreeNode[];
  visitedValues?: number[];
};

export type Step = {
  line: number;
  note: string;
  variables: Record<string, VarValue>;
  arrays?: ArrayView[];
  stacks?: StackView[];
  queues?: QueueView[];
  trees?: TreeView[];
  output?: string;
};

export type Problem = {
  id: string;
  name: string;
  code: string;
  language: "javascript";
  run: () => Step[];
};

export type TreeNode = {
  value: number;
  x: number;
  y: number;
  index?: number;
  left?: number;
  right?: number;
};

function treeFromArray(arr: (number | null)[]): TreeNode[] {
  const nodes: TreeNode[] = arr.map((v, i) => ({
    value: v ?? 0,
    x: 0,
    y: 0,
    index: i,
    left: undefined,
    right: undefined,
  })) as unknown as TreeNode[];

  for (let i = 0; i < arr.length; i++) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < arr.length && arr[left] !== null) nodes[i].left = left;
    if (right < arr.length && arr[right] !== null) nodes[i].right = right;
  }

  const levels = Math.ceil(Math.log2(arr.length + 1));
  const width = Math.pow(2, levels - 1) * 64;
  function setPos(idx: number, depth: number, xRange: [number, number]) {
    if (idx >= arr.length || arr[idx] === null) return;
    const [x0, x1] = xRange;
    nodes[idx].x = (x0 + x1) / 2;
    nodes[idx].y = depth * 80 + 24;
    setPos(2 * idx + 1, depth + 1, [x0, (x0 + x1) / 2]);
    setPos(2 * idx + 2, depth + 1, [(x0 + x1) / 2, x1]);
  }
  setPos(0, 0, [0, width]);
  return nodes;
}

export const problems: Problem[] = [
  {
    id: "two-sum",
    name: "Two Sum II (Sorted)",
    language: "javascript",
    code: `function twoSum(nums, target) {
  let left = 0;
  let right = nums.length - 1;

  while (left < right) {
    let sum = nums[left] + nums[right];

    if (sum === target) {
      return [left, right];
    } else if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return [-1, -1];
}`,
    run() {
      const nums = [2, 7, 11, 15];
      const target = 9;
      const steps: Step[] = [];

      steps.push({
        line: 1,
        note: "Initialize two pointers at opposite ends of the sorted array.",
        variables: { nums: `[${nums}]`, target },
      });

      let left = 0;
      let right = nums.length - 1;

      steps.push({
        line: 2,
        note: `left = ${left}`,
        variables: { left, right, nums: `[${nums}]`, target },
        arrays: [
          {
            id: "nums",
            label: "nums",
            values: nums,
            pointers: [
              { index: left, label: "L" },
              { index: right, label: "R" },
            ],
          },
        ],
      });

      while (left < right) {
        const sum = nums[left] + nums[right];

        steps.push({
          line: 5,
          note: `Calculate sum at the pointers: ${nums[left]} + ${nums[right]} = ${sum}`,
          variables: { left, right, sum, target },
          arrays: [
            {
              id: "nums",
              label: "nums",
              values: nums,
              pointers: [
                { index: left, label: "L" },
                { index: right, label: "R" },
              ],
              highlightRange: [left, right],
            },
          ],
        });

        if (sum === target) {
          steps.push({
            line: 7,
            note: `Found the pair at indices ${left} and ${right}.`,
            variables: { left, right, sum, target },
            arrays: [
              {
                id: "nums",
                label: "nums",
                values: nums,
                pointers: [
                  { index: left, label: "L" },
                  { index: right, label: "R" },
                ],
                highlightRange: [left, right],
              },
            ],
            output: `[${left}, ${right}]`,
          });
          return steps;
        } else if (sum < target) {
          left++;
          steps.push({
            line: 9,
            note: "Sum is too small, move the left pointer right.",
            variables: { left, right, sum, target },
            arrays: [
              {
                id: "nums",
                label: "nums",
                values: nums,
                pointers: [
                  { index: left, label: "L" },
                  { index: right, label: "R" },
                ],
              },
            ],
          });
        } else {
          right--;
          steps.push({
            line: 11,
            note: "Sum is too large, move the right pointer left.",
            variables: { left, right, sum, target },
            arrays: [
              {
                id: "nums",
                label: "nums",
                values: nums,
                pointers: [
                  { index: left, label: "L" },
                  { index: right, label: "R" },
                ],
              },
            ],
          });
        }
      }

      steps.push({
        line: 14,
        note: "No pair found.",
        variables: { left, right, target },
        output: "[-1, -1]",
      });

      return steps;
    },
  },
  {
    id: "valid-parens",
    name: "Valid Parentheses",
    language: "javascript",
    code: `function isValid(s) {
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };

  for (let i = 0; i < s.length; i++) {
    let char = s[i];

    if (char in pairs) {
      let top = stack.length ? stack[stack.length - 1] : null;
      if (top === pairs[char]) {
        stack.pop();
      } else {
        return false;
      }
    } else {
      stack.push(char);
    }
  }

  return stack.length === 0;
}`,
    run() {
      const s = "()[]{}";
      const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
      const steps: Step[] = [];
      const stack: string[] = [];

      steps.push({
        line: 1,
        note: "Prepare an empty stack to track unmatched opening brackets.",
        variables: { s, stack: "[]", pairs: JSON.stringify(pairs) },
        stacks: [{ id: "stack", label: "stack", values: [...stack] }],
      });

      for (let i = 0; i < s.length; i++) {
        const char = s[i];

        steps.push({
          line: 4,
          note: `Read character '${char}' at index ${i}.`,
          variables: { i, char, s },
          stacks: [{ id: "stack", label: "stack", values: [...stack] }],
        });

        if (char in pairs) {
          const top = stack.length ? stack[stack.length - 1] : null;
          steps.push({
            line: 6,
            note: `It's a closing bracket. Top of stack is ${top ?? "empty"}.`,
            variables: { i, char, top, s },
            stacks: [{ id: "stack", label: "stack", values: [...stack] }],
          });

          if (top === pairs[char]) {
            stack.pop();
            steps.push({
              line: 7,
              note: `Matched '${char}' with '${top}'. Pop the stack.`,
              variables: { i, char, top, s },
              stacks: [{ id: "stack", label: "stack", values: [...stack], topIndex: stack.length - 1 }],
            });
          } else {
            steps.push({
              line: 9,
              note: `Mismatched bracket. Returning false.`,
              variables: { i, char, top, s },
              stacks: [{ id: "stack", label: "stack", values: [...stack] }],
              output: "false",
            });
            return steps;
          }
        } else {
          stack.push(char);
          steps.push({
            line: 12,
            note: `It's an opening bracket. Push '${char}' onto the stack.`,
            variables: { i, char, s },
            stacks: [{ id: "stack", label: "stack", values: [...stack], topIndex: stack.length - 1 }],
          });
        }
      }

      const valid = stack.length === 0;
      steps.push({
        line: 15,
        note: `Reached the end of the string. Stack is ${stack.length ? "not " : ""}empty.`,
        variables: { s, stackLength: stack.length },
        stacks: [{ id: "stack", label: "stack", values: [...stack] }],
        output: valid ? "true" : "false",
      });

      return steps;
    },
  },
  {
    id: "tree-bfs",
    name: "Binary Tree Level Order",
    language: "javascript",
    code: `function levelOrder(root) {
  if (!root) return [];
  const result = [];
  let queue = [root];

  while (queue.length > 0) {
    let levelSize = queue.length;
    let level = [];

    for (let i = 0; i < levelSize; i++) {
      let node = queue.shift();
      level.push(node.val);

      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    result.push(level);
  }

  return result;
}`,
    run() {
      const arr = [3, 9, 20, null, null, 15, 7];
      const treeNodes = treeFromArray(arr);
      const queue = [0];
      const result: number[][] = [];
      const steps: Step[] = [];
      const visited: number[] = [];

      steps.push({
        line: 1,
        note: "Start BFS from the root node.",
        variables: { root: 0 },
        trees: [{ id: "tree", label: "tree", nodes: treeNodes }],
        queues: [{ id: "queue", label: "queue", values: [...queue] }],
      });

      while (queue.length > 0) {
        const levelSize = queue.length;
        const level: number[] = [];

        steps.push({
          line: 5,
          note: `New level. levelSize = ${levelSize}.`,
          variables: { queue: `[${queue}]`, levelSize },
          queues: [{ id: "queue", label: "queue", values: [...queue] }],
          trees: [{ id: "tree", label: "tree", nodes: treeNodes, visitedValues: [...visited] }],
        });

        for (let i = 0; i < levelSize; i++) {
          const nodeIdx = queue.shift() as number;
          const node = treeNodes[nodeIdx];
          level.push(node.value);
          visited.push(nodeIdx);

          steps.push({
            line: 8,
            note: `Dequeue node ${nodeIdx} with value ${node.value}.`,
            variables: { i, nodeIdx, nodeValue: node.value, level: `[${level}]` },
            queues: [{ id: "queue", label: "queue", values: [...queue] }],
            trees: [
              { id: "tree", label: "tree", nodes: treeNodes, visitedValues: [...visited] },
            ],
          });

          if (node.left !== undefined) {
            queue.push(node.left);
            steps.push({
              line: 10,
              note: `Enqueue left child ${node.left} (${treeNodes[node.left].value}).`,
              variables: { i, nodeIdx, left: node.left, queue: `[${queue}]` },
              queues: [{ id: "queue", label: "queue", values: [...queue] }],
              trees: [{ id: "tree", label: "tree", nodes: treeNodes, visitedValues: [...visited] }],
            });
          }
          if (node.right !== undefined) {
            queue.push(node.right);
            steps.push({
              line: 11,
              note: `Enqueue right child ${node.right} (${treeNodes[node.right].value}).`,
              variables: { i, nodeIdx, right: node.right, queue: `[${queue}]` },
              queues: [{ id: "queue", label: "queue", values: [...queue] }],
              trees: [{ id: "tree", label: "tree", nodes: treeNodes, visitedValues: [...visited] }],
            });
          }
        }

        result.push(level);
        steps.push({
          line: 14,
          note: `Finished level: [${level}].`,
          variables: { result: JSON.stringify(result) },
          queues: [{ id: "queue", label: "queue", values: [...queue] }],
          trees: [{ id: "tree", label: "tree", nodes: treeNodes, visitedValues: [...visited] }],
        });
      }

      steps.push({
        line: 16,
        note: `BFS complete. Result: ${JSON.stringify(result)}`,
        variables: { result: JSON.stringify(result) },
        output: JSON.stringify(result),
      });

      return steps;
    },
  },
];
