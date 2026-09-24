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
`;
}
