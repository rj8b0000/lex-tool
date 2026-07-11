export function stripComments(source: string): string {
  let out = "";
  let quote = "";
  let block = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];
    if (block) { if (c === "*" && n === "/") { block = false; i++; out += "  "; } else out += c === "\n" ? "\n" : " "; continue; }
    if (quote) { out += c; if (c === "\\") { out += n || ""; i++; } else if (c === quote) quote = ""; continue; }
    if (c === '"' || c === "'") { quote = c; out += c; continue; }
    if (c === "/" && n === "*") { block = true; i++; out += "  "; continue; }
    if (c === "/" && n === "/") { while (i < source.length && source[i] !== "\n") { out += " "; i++; } if (i < source.length) out += "\n"; continue; }
    out += c;
  }
  return out;
}

export function unescapeLexChar(value: string): string {
  const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", f: "\f", v: "\v", b: "\b" };
  if (value.length === 2 && value[0] === "\\") return map[value[1]] ?? value[1];
  if (value.startsWith("\\x")) return String.fromCharCode(parseInt(value.slice(2), 16));
  if (value.startsWith("\\u")) return String.fromCharCode(parseInt(value.slice(2), 16));
  return value;
}
