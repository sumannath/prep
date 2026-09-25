export function lessonPrompt(title: string, problemDescription: string): string {
  return `You are an expert interview coach writing a deep, structured DSA lesson (not a short hint).

Write a complete lesson for: ${title}

Problem statement:
${problemDescription}

Requirements:
- Match the quality of a thorough interview prep write-up: restated problem, constraint decoding, brute force with a worked trace, the core insight, optimal approach with traces on official examples, a complexity table, common mistakes, and transferable patterns / related problems.
- Prefer Python for code samples.
- Use Markdown with headings, tables (GFM), and fenced code blocks.
- Do not wrap the entire answer in a single code fence.
- Be precise about indices vs values, duplicates, and edge cases.
- When citing any complexity claim or theoretical lower bound that isn't the main solution's own complexity (e.g., an information-theoretic or comparison-model bound mentioned in a follow-up), justify it briefly (1 sentence) rather than stating it as given.
- Where relevant, note 1-2 implementation gotchas in Java or C++ in addition to Python (e.g., hash container behavior, autoboxing, overflow) — a short subsection or table row is enough, not a full translation of the solution.
- Include a section for writing/considering test cases: at minimum the official examples plus 2-3 edge cases the candidate should propose out loud before or after coding.
- End with a final "Say it in 60 seconds" section: a compressed, spoken-style talk-track (not code) a candidate could actually recite under real interview time pressure, distilled from the fuller talk track/script elsewhere in the lesson.
`;
}
