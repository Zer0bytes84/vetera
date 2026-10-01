/** Convert the small Markdown subset used by note drafts to safe editor HTML. */
export function noteMarkdownToHTML(text: string): string {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const inline = (value: string) => escape(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
  const blocks: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => { if (list) blocks.push(`</${list}>`); list = null; };

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    let line = raw.trim();
    // Small local models sometimes put the Markdown marker inside bold text.
    if (/^\*\*#{1,6}[\s\u00a0]/.test(line) && line.endsWith("**")) {
      line = line.slice(2, -2).trim();
    }
    const heading = /^(#{1,6})[\s\u00a0]+(.+?)(?:\s+#+)?$/.exec(line);
    const item = /^(?:([-*+])\s+|\d+[.)]\s+)(.+)$/.exec(line);
    if (heading) {
      closeList();
      // The editor exposes three heading levels; deeper Markdown stays readable.
      const level = Math.min(3, heading[1].length);
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (item) {
      const kind = item[1] ? "ul" : "ol";
      if (list !== kind) { closeList(); blocks.push(`<${kind}>`); list = kind; }
      blocks.push(`<li><p>${inline(item[2])}</p></li>`);
    } else {
      closeList();
      if (line) blocks.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return blocks.join("\n");
}
