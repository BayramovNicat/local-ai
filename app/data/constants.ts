import type { AccentPreset, Message } from "@/app/types";

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: "Neon Green", hex: "#22C55E" },
  { name: "Electric Blue", hex: "#00D4FF" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Hot Pink", hex: "#FF2D78" },
  { name: "Amber", hex: "#FBBF24" },
  { name: "Coral", hex: "#FF6B6B" },
  { name: "Cyan", hex: "#22D3EE" },
  { name: "Mint", hex: "#34D399" },
  { name: "Ice Blue", hex: "#60A5FA" },
  { name: "Orange", hex: "#FB923C" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Lime", hex: "#84CC16" },
];

export const MOCK_MODELS = ["TinyLlama 1.1B", "Qwen 2.5 7B", "Phi-3 Mini"];

export const MOCK_HISTORY = [
  "Explain quantum computing",
  "Python sorting algorithms",
  "How does TCP/IP work?",
  "Write a React hook",
  "Database indexing strategies",
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Can you show me how to write a binary search in Python?",
  },
  {
    id: "2",
    role: "assistant",
    content: `Sure! Here's a clean implementation of **binary search** in Python:

\`\`\`python
def binary_search(arr: list[int], target: int) -> int:
    low, high = 0, len(arr) - 1

    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1  # not found
\`\`\`

### Key Points

- **Time complexity**: \`O(log n)\` — much faster than linear search
- **Space complexity**: \`O(1)\` for the iterative version
- The input array **must be sorted**

### When to use it

1. Searching in a **sorted array** or list
2. Finding boundaries (e.g., first/last occurrence)
3. Problems involving **monotonic functions**

> Binary search is one of the most fundamental algorithms — make sure you can write it from memory!`,
  },
  {
    id: "3",
    role: "user",
    content: "What about a recursive version?",
  },
  {
    id: "4",
    role: "assistant",
    content: `Here's the **recursive** version:

\`\`\`python
def binary_search_recursive(arr, target, low=0, high=None):
    if high is None:
        high = len(arr) - 1

    if low > high:
        return -1

    mid = (low + high) // 2

    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        return binary_search_recursive(arr, target, mid + 1, high)
    else:
        return binary_search_recursive(arr, target, low, mid - 1)
\`\`\`

| Aspect | Iterative | Recursive |
|--------|-----------|-----------|
| Space | \`O(1)\` | \`O(log n)\` stack |
| Speed | Slightly faster | Same big-O |
| Readability | Loop-based | More elegant |

Most production code uses the **iterative** version to avoid stack overflow on large inputs. Python's default recursion limit is \`1000\`, so for arrays larger than ~1000 elements the recursive version can fail without \`sys.setrecursionlimit()\`.`,
  },
];
