// Helpers de parsing XML para dispositivos PT

export function tagContent(xml: string, tag: string, fallback = ""): string {
  const selfClosingRe = new RegExp(`<${tag}(?:\\s[^>]*)?\\/>`, "i");
  const openRe = new RegExp(`<${tag}(?:[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");

  const selfMatch = selfClosingRe.exec(xml);
  const openMatch = openRe.exec(xml);

  if (selfMatch && (!openMatch || selfMatch.index <= openMatch.index)) {
    return fallback;
  }
  return openMatch ? openMatch[1].trim() : fallback;
}

export function tagSelfClosing(xml: string, tag: string, fallback = ""): string {
  const re = new RegExp(`<${tag}(?:[^>]*)?\\/>`, "i");
  const m = xml.match(re);
  return m ? (fallback !== "" ? fallback : m[0]) : fallback;
}

export function tagHasAttr(xml: string, tag: string, attr: string): boolean {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=`, "i");
  return re.test(xml);
}

export function tagAttrWithText(xml: string, tag: string, attr: string, fallback = ""): string {
  const re = new RegExp(`<${tag}([^>]*)>([^<]*)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return fallback;
  const attrRe = new RegExp(`${attr}=["']([^"']*)["']`, "i");
  const attrMatch = m[1].match(attrRe);
  return attrMatch ? m[2].trim() : fallback;
}

export function tagAttr(xml: string, tag: string, attr: string, fallback = ""): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["']`, "i");
  const m = xml.match(re);
  return m ? m[1] : fallback;
}

export function tagContentAfterAttr(xml: string, tag: string, attr: string, fallback = ""): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}(?:=[^>]*)?>([^<]*)`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : fallback;
}

export function allTags(xml: string, tag: string): string[] {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?>(?:[\\s\\S]*?)<\\/${tag}>|<${tag}(?:\\s[^>]*)?\\/>`,
    "gi",
  );
  const matches: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[0]);
  }
  re.lastIndex = 0;
  return matches;
}

export function allNonEmpty(...calls: string[][]): string[] {
  for (const c of calls) if (c.length > 0) return c;
  return [];
}

export function parseBool(val: string): boolean {
  return val === "true" || val === "1" || val === "on";
}

export function parseBoolOrStr(val: string): boolean | undefined {
  if (!val) return undefined;
  return val === "true" || val === "1" || val === "on";
}
