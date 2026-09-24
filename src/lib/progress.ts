const KEY = "prep:studied";

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function getStudied(): Set<string> {
  return read();
}

export function setStudied(slug: string, studied: boolean): Set<string> {
  const next = read();
  if (studied) next.add(slug);
  else next.delete(slug);
  localStorage.setItem(KEY, JSON.stringify([...next]));
  return next;
}
