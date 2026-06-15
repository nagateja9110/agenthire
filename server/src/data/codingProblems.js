/**
 * Curated LeetCode-style coding problems for the interview coding round.
 *
 * Problems are stdin/stdout based so they run uniformly across C++, Python,
 * and Java with no per-language test harness. Each problem ships verified
 * boilerplate (I/O scaffolding + an empty function for the candidate to fill)
 * plus sample (visible) and hidden test cases. Test outputs are hand-verified
 * so a correct solution always passes - we never rely on an LLM to invent
 * test cases, which could mark a correct answer wrong.
 */

const maxSubarray = {
  id: 'max-subarray',
  title: 'Maximum Subarray Sum',
  difficulty: 'Medium',
  description: [
    'Given an integer array `nums`, find the contiguous subarray (containing at least one number)',
    'that has the largest sum, and return that sum.',
    '',
    'Input format:',
    '  Line 1: an integer N — the number of elements.',
    '  Line 2: N space-separated integers.',
    '',
    'Output:',
    '  A single integer — the maximum subarray sum.',
    '',
    'Constraints: 1 ≤ N ≤ 10^5, -10^4 ≤ nums[i] ≤ 10^4.',
  ].join('\n'),
  starter_code: {
    python: `import sys

def max_subarray(nums):
    # Write your solution here
    pass

def main():
    data = sys.stdin.read().split()
    n = int(data[0])
    nums = list(map(int, data[1:1 + n]))
    print(max_subarray(nums))

main()
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

long long maxSubarray(vector<long long>& nums) {
    // Write your solution here
    return 0;
}

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<long long> nums(n);
    for (auto &x : nums) cin >> x;
    cout << maxSubarray(nums) << endl;
    return 0;
}
`,
    java: `import java.util.*;

class Main {
    static long maxSubarray(long[] nums) {
        // Write your solution here
        return 0;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long[] nums = new long[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();
        System.out.println(maxSubarray(nums));
    }
}
`,
  },
  sample_tests: [
    {
      input: '9\n-2 1 -3 4 -1 2 1 -5 4',
      expected_output: '6',
      explanation: 'The subarray [4, -1, 2, 1] has the largest sum = 6.',
    },
    {
      input: '1\n1',
      expected_output: '1',
      explanation: 'A single element is its own maximum subarray.',
    },
  ],
  hidden_tests: [
    { input: '5\n-1 -2 -3 -4 -5', expected_output: '-1' },
    { input: '4\n1 2 3 4', expected_output: '10' },
    { input: '8\n-2 -3 4 -1 -2 1 5 -3', expected_output: '7' },
  ],
};

const pairWithTargetSum = {
  id: 'pair-target-sum',
  title: 'Pair With Target Sum',
  difficulty: 'Easy',
  description: [
    'Given an array of integers `nums` and a target value, determine whether there exist two',
    'distinct elements (at different indices) whose sum equals the target.',
    '',
    'Input format:',
    '  Line 1: two integers N and target.',
    '  Line 2: N space-separated integers.',
    '',
    'Output:',
    '  Print "YES" if such a pair exists, otherwise "NO".',
    '',
    'Constraints: 1 ≤ N ≤ 10^5, values fit in a 64-bit integer.',
  ].join('\n'),
  starter_code: {
    python: `import sys

def has_pair(nums, target):
    # Write your solution here
    pass

def main():
    data = sys.stdin.read().split()
    n, target = int(data[0]), int(data[1])
    nums = list(map(int, data[2:2 + n]))
    print("YES" if has_pair(nums, target) else "NO")

main()
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

bool hasPair(vector<long long>& nums, long long target) {
    // Write your solution here
    return false;
}

int main() {
    int n; long long target;
    if (!(cin >> n >> target)) return 0;
    vector<long long> nums(n);
    for (auto &x : nums) cin >> x;
    cout << (hasPair(nums, target) ? "YES" : "NO") << endl;
    return 0;
}
`,
    java: `import java.util.*;

class Main {
    static boolean hasPair(long[] nums, long target) {
        // Write your solution here
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long target = sc.nextLong();
        long[] nums = new long[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();
        System.out.println(hasPair(nums, target) ? "YES" : "NO");
    }
}
`,
  },
  sample_tests: [
    {
      input: '4 9\n2 7 11 15',
      expected_output: 'YES',
      explanation: '2 + 7 = 9.',
    },
    {
      input: '3 8\n1 2 4',
      expected_output: 'NO',
      explanation: 'No two distinct elements sum to 8.',
    },
  ],
  hidden_tests: [
    { input: '5 10\n1 2 3 7 5', expected_output: 'YES' },
    { input: '2 5\n2 2', expected_output: 'NO' },
    { input: '6 0\n-1 1 2 3 -3 5', expected_output: 'YES' },
  ],
};

const POOL = [maxSubarray, pairWithTargetSum];

// Picks a problem for a session. Deterministic-friendly: random by default.
function pickProblem() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

module.exports = { POOL, pickProblem };
