export type TopicId =
  | "arrays-hashing"
  | "two-pointers"
  | "sliding-window"
  | "stack"
  | "binary-search"
  | "linked-list"
  | "trees"
  | "heap"
  | "backtracking"
  | "tries"
  | "graphs"
  | "advanced-graphs"
  | "1d-dp"
  | "2d-dp"
  | "greedy"
  | "intervals"
  | "math-geometry"
  | "bit-manipulation";

export type CatalogEntry = {
  id: number;
  slug: string;
  title: string;
  topic: TopicId;
};

export const TOPICS: { id: TopicId; label: string }[] = [
  { id: "arrays-hashing", label: "Arrays & Hashing" },
  { id: "two-pointers", label: "Two Pointers" },
  { id: "sliding-window", label: "Sliding Window" },
  { id: "stack", label: "Stack" },
  { id: "binary-search", label: "Binary Search" },
  { id: "linked-list", label: "Linked List" },
  { id: "trees", label: "Trees" },
  { id: "heap", label: "Heap / Priority Queue" },
  { id: "backtracking", label: "Backtracking" },
  { id: "tries", label: "Tries" },
  { id: "graphs", label: "Graphs" },
  { id: "advanced-graphs", label: "Advanced Graphs" },
  { id: "1d-dp", label: "1-D Dynamic Programming" },
  { id: "2d-dp", label: "2-D Dynamic Programming" },
  { id: "greedy", label: "Greedy" },
  { id: "intervals", label: "Intervals" },
  { id: "math-geometry", label: "Math & Geometry" },
  { id: "bit-manipulation", label: "Bit Manipulation" },
];

export const NEETCODE_150: CatalogEntry[] = [
  { id: 217, slug: "contains-duplicate", title: "Contains Duplicate", topic: "arrays-hashing" },
  { id: 242, slug: "valid-anagram", title: "Valid Anagram", topic: "arrays-hashing" },
  { id: 1, slug: "two-sum", title: "Two Sum", topic: "arrays-hashing" },
  { id: 49, slug: "group-anagrams", title: "Group Anagrams", topic: "arrays-hashing" },
  { id: 347, slug: "top-k-frequent-elements", title: "Top K Frequent Elements", topic: "arrays-hashing" },
  { id: 238, slug: "product-of-array-except-self", title: "Product of Array Except Self", topic: "arrays-hashing" },
  { id: 36, slug: "valid-sudoku", title: "Valid Sudoku", topic: "arrays-hashing" },
  { id: 271, slug: "encode-and-decode-strings", title: "Encode and Decode Strings", topic: "arrays-hashing" },
  { id: 128, slug: "longest-consecutive-sequence", title: "Longest Consecutive Sequence", topic: "arrays-hashing" },

  { id: 125, slug: "valid-palindrome", title: "Valid Palindrome", topic: "two-pointers" },
  { id: 167, slug: "two-sum-ii-input-array-is-sorted", title: "Two Sum II - Input Array Is Sorted", topic: "two-pointers" },
  { id: 15, slug: "3sum", title: "3Sum", topic: "two-pointers" },
  { id: 11, slug: "container-with-most-water", title: "Container With Most Water", topic: "two-pointers" },
  { id: 42, slug: "trapping-rain-water", title: "Trapping Rain Water", topic: "two-pointers" },

  { id: 121, slug: "best-time-to-buy-and-sell-stock", title: "Best Time to Buy and Sell Stock", topic: "sliding-window" },
  { id: 3, slug: "longest-substring-without-repeating-characters", title: "Longest Substring Without Repeating Characters", topic: "sliding-window" },
  { id: 424, slug: "longest-repeating-character-replacement", title: "Longest Repeating Character Replacement", topic: "sliding-window" },
  { id: 567, slug: "permutation-in-string", title: "Permutation in String", topic: "sliding-window" },
  { id: 76, slug: "minimum-window-substring", title: "Minimum Window Substring", topic: "sliding-window" },
  { id: 239, slug: "sliding-window-maximum", title: "Sliding Window Maximum", topic: "sliding-window" },

  { id: 20, slug: "valid-parentheses", title: "Valid Parentheses", topic: "stack" },
  { id: 155, slug: "min-stack", title: "Min Stack", topic: "stack" },
  { id: 150, slug: "evaluate-reverse-polish-notation", title: "Evaluate Reverse Polish Notation", topic: "stack" },
  { id: 22, slug: "generate-parentheses", title: "Generate Parentheses", topic: "stack" },
  { id: 739, slug: "daily-temperatures", title: "Daily Temperatures", topic: "stack" },
  { id: 853, slug: "car-fleet", title: "Car Fleet", topic: "stack" },

  { id: 704, slug: "binary-search", title: "Binary Search", topic: "binary-search" },
  { id: 74, slug: "search-a-2d-matrix", title: "Search a 2D Matrix", topic: "binary-search" },
  { id: 875, slug: "koko-eating-bananas", title: "Koko Eating Bananas", topic: "binary-search" },
  { id: 153, slug: "find-minimum-in-rotated-sorted-array", title: "Find Minimum in Rotated Sorted Array", topic: "binary-search" },
  { id: 33, slug: "search-in-rotated-sorted-array", title: "Search in Rotated Sorted Array", topic: "binary-search" },
  { id: 981, slug: "time-based-key-value-store", title: "Time Based Key-Value Store", topic: "binary-search" },
  { id: 4, slug: "median-of-two-sorted-arrays", title: "Median of Two Sorted Arrays", topic: "binary-search" },

  { id: 206, slug: "reverse-linked-list", title: "Reverse Linked List", topic: "linked-list" },
  { id: 21, slug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists", topic: "linked-list" },
  { id: 143, slug: "reorder-list", title: "Reorder List", topic: "linked-list" },
  { id: 19, slug: "remove-nth-node-from-end-of-list", title: "Remove Nth Node From End of List", topic: "linked-list" },
  { id: 138, slug: "copy-list-with-random-pointer", title: "Copy List with Random Pointer", topic: "linked-list" },
  { id: 2, slug: "add-two-numbers", title: "Add Two Numbers", topic: "linked-list" },
  { id: 141, slug: "linked-list-cycle", title: "Linked List Cycle", topic: "linked-list" },
  { id: 287, slug: "find-the-duplicate-number", title: "Find the Duplicate Number", topic: "linked-list" },
  { id: 146, slug: "lru-cache", title: "LRU Cache", topic: "linked-list" },
  { id: 23, slug: "merge-k-sorted-lists", title: "Merge k Sorted Lists", topic: "linked-list" },
  { id: 25, slug: "reverse-nodes-in-k-group", title: "Reverse Nodes in k-Group", topic: "linked-list" },

  { id: 226, slug: "invert-binary-tree", title: "Invert Binary Tree", topic: "trees" },
  { id: 104, slug: "maximum-depth-of-binary-tree", title: "Maximum Depth of Binary Tree", topic: "trees" },
  { id: 543, slug: "diameter-of-binary-tree", title: "Diameter of Binary Tree", topic: "trees" },
  { id: 110, slug: "balanced-binary-tree", title: "Balanced Binary Tree", topic: "trees" },
  { id: 100, slug: "same-tree", title: "Same Tree", topic: "trees" },
  { id: 572, slug: "subtree-of-another-tree", title: "Subtree of Another Tree", topic: "trees" },
  { id: 235, slug: "lowest-common-ancestor-of-a-binary-search-tree", title: "Lowest Common Ancestor of a BST", topic: "trees" },
  { id: 102, slug: "binary-tree-level-order-traversal", title: "Binary Tree Level Order Traversal", topic: "trees" },
  { id: 199, slug: "binary-tree-right-side-view", title: "Binary Tree Right Side View", topic: "trees" },
  { id: 1448, slug: "count-good-nodes-in-binary-tree", title: "Count Good Nodes in Binary Tree", topic: "trees" },
  { id: 98, slug: "validate-binary-search-tree", title: "Validate Binary Search Tree", topic: "trees" },
  { id: 230, slug: "kth-smallest-element-in-a-bst", title: "Kth Smallest Element in a BST", topic: "trees" },
  { id: 105, slug: "construct-binary-tree-from-preorder-and-inorder-traversal", title: "Construct Binary Tree from Preorder and Inorder Traversal", topic: "trees" },
  { id: 124, slug: "binary-tree-maximum-path-sum", title: "Binary Tree Maximum Path Sum", topic: "trees" },
  { id: 297, slug: "serialize-and-deserialize-binary-tree", title: "Serialize and Deserialize Binary Tree", topic: "trees" },

  { id: 703, slug: "kth-largest-element-in-a-stream", title: "Kth Largest Element in a Stream", topic: "heap" },
  { id: 1046, slug: "last-stone-weight", title: "Last Stone Weight", topic: "heap" },
  { id: 973, slug: "k-closest-points-to-origin", title: "K Closest Points to Origin", topic: "heap" },
  { id: 215, slug: "kth-largest-element-in-an-array", title: "Kth Largest Element in an Array", topic: "heap" },
  { id: 621, slug: "task-scheduler", title: "Task Scheduler", topic: "heap" },
  { id: 355, slug: "design-twitter", title: "Design Twitter", topic: "heap" },
  { id: 295, slug: "find-median-from-data-stream", title: "Find Median from Data Stream", topic: "heap" },

  { id: 78, slug: "subsets", title: "Subsets", topic: "backtracking" },
  { id: 39, slug: "combination-sum", title: "Combination Sum", topic: "backtracking" },
  { id: 46, slug: "permutations", title: "Permutations", topic: "backtracking" },
  { id: 90, slug: "subsets-ii", title: "Subsets II", topic: "backtracking" },
  { id: 40, slug: "combination-sum-ii", title: "Combination Sum II", topic: "backtracking" },
  { id: 79, slug: "word-search", title: "Word Search", topic: "backtracking" },
  { id: 131, slug: "palindrome-partitioning", title: "Palindrome Partitioning", topic: "backtracking" },
  { id: 17, slug: "letter-combinations-of-a-phone-number", title: "Letter Combinations of a Phone Number", topic: "backtracking" },
  { id: 51, slug: "n-queens", title: "N-Queens", topic: "backtracking" },
  { id: 37, slug: "sudoku-solver", title: "Sudoku Solver", topic: "backtracking" },

  { id: 208, slug: "implement-trie-prefix-tree", title: "Implement Trie (Prefix Tree)", topic: "tries" },
  { id: 211, slug: "design-add-and-search-words-data-structure", title: "Design Add and Search Words Data Structure", topic: "tries" },
  { id: 212, slug: "word-search-ii", title: "Word Search II", topic: "tries" },

  { id: 200, slug: "number-of-islands", title: "Number of Islands", topic: "graphs" },
  { id: 133, slug: "clone-graph", title: "Clone Graph", topic: "graphs" },
  { id: 695, slug: "max-area-of-island", title: "Max Area of Island", topic: "graphs" },
  { id: 417, slug: "pacific-atlantic-water-flow", title: "Pacific Atlantic Water Flow", topic: "graphs" },
  { id: 130, slug: "surrounded-regions", title: "Surrounded Regions", topic: "graphs" },
  { id: 994, slug: "rotting-oranges", title: "Rotting Oranges", topic: "graphs" },
  { id: 207, slug: "course-schedule", title: "Course Schedule", topic: "graphs" },
  { id: 210, slug: "course-schedule-ii", title: "Course Schedule II", topic: "graphs" },
  { id: 261, slug: "graph-valid-tree", title: "Graph Valid Tree", topic: "graphs" },
  { id: 323, slug: "number-of-connected-components-in-an-undirected-graph", title: "Number of Connected Components in an Undirected Graph", topic: "graphs" },
  { id: 684, slug: "redundant-connection", title: "Redundant Connection", topic: "graphs" },
  { id: 127, slug: "word-ladder", title: "Word Ladder", topic: "graphs" },
  { id: 286, slug: "walls-and-gates", title: "Walls and Gates", topic: "graphs" },

  { id: 332, slug: "reconstruct-itinerary", title: "Reconstruct Itinerary", topic: "advanced-graphs" },
  { id: 1584, slug: "min-cost-to-connect-all-points", title: "Min Cost to Connect All Points", topic: "advanced-graphs" },
  { id: 743, slug: "network-delay-time", title: "Network Delay Time", topic: "advanced-graphs" },
  { id: 778, slug: "swim-in-rising-water", title: "Swim in Rising Water", topic: "advanced-graphs" },
  { id: 787, slug: "cheapest-flights-within-k-stops", title: "Cheapest Flights Within K Stops", topic: "advanced-graphs" },
  { id: 269, slug: "alien-dictionary", title: "Alien Dictionary", topic: "advanced-graphs" },

  { id: 70, slug: "climbing-stairs", title: "Climbing Stairs", topic: "1d-dp" },
  { id: 746, slug: "min-cost-climbing-stairs", title: "Min Cost Climbing Stairs", topic: "1d-dp" },
  { id: 198, slug: "house-robber", title: "House Robber", topic: "1d-dp" },
  { id: 213, slug: "house-robber-ii", title: "House Robber II", topic: "1d-dp" },
  { id: 5, slug: "longest-palindromic-substring", title: "Longest Palindromic Substring", topic: "1d-dp" },
  { id: 647, slug: "palindromic-substrings", title: "Palindromic Substrings", topic: "1d-dp" },
  { id: 91, slug: "decode-ways", title: "Decode Ways", topic: "1d-dp" },
  { id: 322, slug: "coin-change", title: "Coin Change", topic: "1d-dp" },
  { id: 152, slug: "maximum-product-subarray", title: "Maximum Product Subarray", topic: "1d-dp" },
  { id: 139, slug: "word-break", title: "Word Break", topic: "1d-dp" },
  { id: 300, slug: "longest-increasing-subsequence", title: "Longest Increasing Subsequence", topic: "1d-dp" },
  { id: 416, slug: "partition-equal-subset-sum", title: "Partition Equal Subset Sum", topic: "1d-dp" },

  { id: 62, slug: "unique-paths", title: "Unique Paths", topic: "2d-dp" },
  { id: 1143, slug: "longest-common-subsequence", title: "Longest Common Subsequence", topic: "2d-dp" },
  { id: 309, slug: "best-time-to-buy-and-sell-stock-with-cooldown", title: "Best Time to Buy and Sell Stock with Cooldown", topic: "2d-dp" },
  { id: 518, slug: "coin-change-ii", title: "Coin Change II", topic: "2d-dp" },
  { id: 494, slug: "target-sum", title: "Target Sum", topic: "2d-dp" },
  { id: 97, slug: "interleaving-string", title: "Interleaving String", topic: "2d-dp" },
  { id: 329, slug: "longest-increasing-path-in-a-matrix", title: "Longest Increasing Path in a Matrix", topic: "2d-dp" },
  { id: 115, slug: "distinct-subsequences", title: "Distinct Subsequences", topic: "2d-dp" },
  { id: 72, slug: "edit-distance", title: "Edit Distance", topic: "2d-dp" },
  { id: 312, slug: "burst-balloons", title: "Burst Balloons", topic: "2d-dp" },
  { id: 10, slug: "regular-expression-matching", title: "Regular Expression Matching", topic: "2d-dp" },

  { id: 53, slug: "maximum-subarray", title: "Maximum Subarray", topic: "greedy" },
  { id: 55, slug: "jump-game", title: "Jump Game", topic: "greedy" },
  { id: 45, slug: "jump-game-ii", title: "Jump Game II", topic: "greedy" },
  { id: 134, slug: "gas-station", title: "Gas Station", topic: "greedy" },
  { id: 846, slug: "hand-of-straights", title: "Hand of Straights", topic: "greedy" },
  { id: 1899, slug: "merge-triplets-to-form-target-triplet", title: "Merge Triplets to Form Target Triplet", topic: "greedy" },
  { id: 763, slug: "partition-labels", title: "Partition Labels", topic: "greedy" },
  { id: 678, slug: "valid-parenthesis-string", title: "Valid Parenthesis String", topic: "greedy" },

  { id: 57, slug: "insert-interval", title: "Insert Interval", topic: "intervals" },
  { id: 56, slug: "merge-intervals", title: "Merge Intervals", topic: "intervals" },
  { id: 435, slug: "non-overlapping-intervals", title: "Non-overlapping Intervals", topic: "intervals" },
  { id: 252, slug: "meeting-rooms", title: "Meeting Rooms", topic: "intervals" },
  { id: 253, slug: "meeting-rooms-ii", title: "Meeting Rooms II", topic: "intervals" },
  { id: 1851, slug: "minimum-interval-to-include-each-query", title: "Minimum Interval to Include Each Query", topic: "intervals" },

  { id: 48, slug: "rotate-image", title: "Rotate Image", topic: "math-geometry" },
  { id: 54, slug: "spiral-matrix", title: "Spiral Matrix", topic: "math-geometry" },
  { id: 73, slug: "set-matrix-zeroes", title: "Set Matrix Zeroes", topic: "math-geometry" },
  { id: 202, slug: "happy-number", title: "Happy Number", topic: "math-geometry" },
  { id: 66, slug: "plus-one", title: "Plus One", topic: "math-geometry" },
  { id: 50, slug: "powx-n", title: "Pow(x, n)", topic: "math-geometry" },
  { id: 43, slug: "multiply-strings", title: "Multiply Strings", topic: "math-geometry" },
  { id: 2013, slug: "detect-squares", title: "Detect Squares", topic: "math-geometry" },

  { id: 136, slug: "single-number", title: "Single Number", topic: "bit-manipulation" },
  { id: 191, slug: "number-of-1-bits", title: "Number of 1 Bits", topic: "bit-manipulation" },
  { id: 338, slug: "counting-bits", title: "Counting Bits", topic: "bit-manipulation" },
  { id: 190, slug: "reverse-bits", title: "Reverse Bits", topic: "bit-manipulation" },
  { id: 268, slug: "missing-number", title: "Missing Number", topic: "bit-manipulation" },
  { id: 371, slug: "sum-of-two-integers", title: "Sum of Two Integers", topic: "bit-manipulation" },
  { id: 7, slug: "reverse-integer", title: "Reverse Integer", topic: "bit-manipulation" },
];
