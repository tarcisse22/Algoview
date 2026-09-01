import type { RealProblem } from "./types";

export const realProblems: RealProblem[] = [
  {
    id: "unique-paths",
    name: "Unique Paths",
    difficulty: "Medium",
    category: "Dynamic Programming",
    description:
      "A robot is located at the top-left corner of an m x n grid. It can only move down or right. Count the number of unique paths to the bottom-right corner.",
    examples: [
      { input: "m = 3, n = 7", output: "28", explanation: "28 unique paths in a 3x7 grid." },
    ],
    constraints: "1 <= m, n <= 100",
    starterCode: `const dp = Array.from({ length: m }, () => new Array(n).fill(0));
dp[0][0] = 1;

for (let r = 0; r < m; r++) {
  for (let c = 0; c < n; c++) {
    if (r > 0) dp[r][c] += dp[r - 1][c];
    if (c > 0) dp[r][c] += dp[r][c - 1];
  }
}

return dp[m - 1][n - 1];`,
    language: "javascript",
    input: { m: 3, n: 4 },
  },
  {
    id: "two-sum-ii",
    name: "Two Sum II",
    difficulty: "Medium",
    category: "Two Pointers",
    description:
      "Given a 1-indexed sorted array of integers, find two numbers such that they add up to a specific target number. Return the 1-indexed indices.",
    examples: [
      { input: "numbers = [2,7,11,15], target = 9", output: "[1,2]", explanation: "2 + 7 = 9." },
    ],
    starterCode: `let left = 0;
let right = nums.length - 1;

while (left < right) {
  let sum = nums[left] + nums[right];

  if (sum === target) {
    return [left + 1, right + 1];
  } else if (sum < target) {
    left++;
  } else {
    right--;
  }
}

return [-1, -1];`,
    language: "javascript",
    input: { nums: [2, 7, 11, 15], target: 9 },
  },
  {
    id: "valid-parentheses",
    name: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stack",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    examples: [
      { input: "s = \"()\"", output: "true" },
    ],
    starterCode: `const stack = [];
const pairs = { ')': '(', '}': '{', ']': '[' };

for (let i = 0; i < s.length; i++) {
  const char = s[i];

  if (pairs[char] === undefined) {
    stack.push(char);
  } else {
    const top = stack.pop();
    if (top !== pairs[char]) {
      return false;
    }
  }
}

return stack.length === 0;`,
    language: "javascript",
    input: { s: "{[()]()}" },
  },
  {
    id: "binary-tree-level-order",
    name: "Binary Tree Level Order",
    difficulty: "Medium",
    category: "Tree",
    description: "Given the root of a binary tree, return the level order traversal of its nodes' values.",
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
    ],
    starterCode: `const result = [];
const queue = [root];

while (queue.length > 0) {
  const size = queue.length;
  const level = [];

  for (let i = 0; i < size; i++) {
    const node = queue.shift();
    level.push(node.val);

    if (node.left !== null) {
      queue.push(node.left);
    }
    if (node.right !== null) {
      queue.push(node.right);
    }
  }

  result.push(level);
}

return result;`,
    language: "javascript",
    input: {
      root: {
        val: 3,
        left: { val: 9, left: null, right: null },
        right: { val: 20, left: { val: 15, left: null, right: null }, right: { val: 7, left: null, right: null } },
      },
    },
  },
];
