import type { TheoryBlock as TheoryBlockType } from "./curriculum-manager.js";

// ============================================================================
// TheoryBlockRenderer — Renders Theory Content for Display
// ============================================================================

/**
 * TheoryBlock renders educational content including:
 * - Markdown/HTML formatted text
 * - ASCII art diagrams
 * - Embedded images
 *
 * Provides multiple output formats for different display contexts
 * (CLI, web, terminal with ANSI colors, etc.)
 */
export class TheoryBlockRenderer {
  private block: TheoryBlockType;

  constructor(block: TheoryBlockType) {
    this.block = block;
  }

  /**
   * Render the full theory block as HTML.
   */
  render(): string {
    return this.renderHtml();
  }

  /**
   * Render as plain text (stripped of markdown/html).
   */
  renderText(): string {
    return this.stripHtml(this.block.content);
  }

  /**
   * Render as Markdown (preserves formatting for markdown renderers).
   */
  renderMarkdown(): string {
    let md = "";

    if (this.block.title) {
      md += `## ${this.block.title}\n\n`;
    }

    md += this.block.content;

    if (this.block.diagramType === "ascii" && this.block.diagramContent) {
      md += "\n\n```\n" + this.block.diagramContent + "\n```\n";
    }

    if (this.block.diagramType === "image" && this.block.diagramContent) {
      md += `\n![Diagram](${this.block.diagramContent})\n`;
    }

    return md;
  }

  /**
   * Render as ANSI-colored text for terminal display.
   */
  renderAnsi(): string {
    let ansi = "";

    // Title in bold cyan
    if (this.block.title) {
      ansi += `\x1b[1;36m${this.block.title}\x1b[0m\n`;
      ansi += "=".repeat(this.block.title.length) + "\n\n";
    }

    // Content (simplified markdown to ANSI conversion)
    ansi += this.markdownToAnsi(this.block.content);

    // ASCII diagram in dim yellow
    if (this.block.diagramType === "ascii" && this.block.diagramContent) {
      ansi += "\n\n\x1b[2;33m" + this.block.diagramContent + "\x1b[0m\n";
    }

    return ansi;
  }

  /**
   * Render as HTML.
   */
  renderHtml(): string {
    let html = "";

    if (this.block.title) {
      html += `<div class="theory-title"><h2>${this.escapeHtml(this.block.title)}</h2></div>\n`;
    }

    // Convert markdown-like content to HTML
    html += `<div class="theory-content">${this.markdownToHtml(this.block.content)}</div>\n`;

    if (this.block.diagramType === "ascii" && this.block.diagramContent) {
      html += `<div class="theory-diagram"><pre>${this.escapeHtml(this.block.diagramContent)}</pre></div>\n`;
    }

    if (this.block.diagramType === "image" && this.block.diagramContent) {
      html += `<div class="theory-diagram"><img src="${this.escapeHtml(this.block.diagramContent)}" alt="Diagram" /></div>\n`;
    }

    return html;
  }

  /**
   * Get the diagram content if present.
   */
  getDiagram(): string | null {
    return this.block.diagramContent ?? null;
  }

  /**
   * Get the diagram type.
   */
  getDiagramType(): "ascii" | "image" | "none" {
    return this.block.diagramType;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private markdownToHtml(md: string): string {
    let html = this.escapeHtml(md);

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");

    // Lists
    html = html.replace(/^\s*-\s+(.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

    // Line breaks and paragraphs
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br />");

    return `<p>${html}</p>`;
  }

  private markdownToAnsi(md: string): string {
    let ansi = md;

    // Bold
    ansi = ansi.replace(/\*\*(.+?)\*\*/g, "\x1b[1m$1\x1b[0m");
    // Italic
    ansi = ansi.replace(/\*(.+?)\*/g, "\x1b[3m$1\x1b[0m");
    // Code
    ansi = ansi.replace(/`(.+?)`/g, "\x1b[2m$1\x1b[0m");

    return ansi;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a TheoryBlockRenderer from a TheoryBlock definition.
 */
export function createTheoryBlockRenderer(block: TheoryBlockType): TheoryBlockRenderer {
  return new TheoryBlockRenderer(block);
}

// ============================================================================
// Common Diagram Templates
// ============================================================================

/**
 * Common ASCII diagram templates for network diagrams.
 */
export const DiagramTemplates = {
  /**
   * Simple two-device connection diagram.
   */
  twoDeviceConnection: (device1: string, device2: string, port1: string, port2: string): string => {
    return `
+-----------+       +-----------+
|  ${device1.padEnd(7)}  |-------${port1}|  ${device2.padEnd(7)}  |
|           |  ${port2}  |           |
+-----------+       +-----------+
`;
  },

  /**
   * VLAN diagram showing switch with multiple VLANs.
   */
  vlanDiagram: (switchName: string): string => {
    return `
                ROUTER
                  |
              [Trunk]
                  |
    +-------------+-------------+
    |                         |
+---+---+               +---+---+
| VLAN 10|               | VLAN 20|
|   PC1  |               |   PC2  |
+--------+               +--------+
${switchName}
`;
  },

  /**
   * Three-tier network topology.
   */
  threeTierTopology: (core: string, dist1: string, dist2: string, access1: string, access2: string): string => {
    return `
           ${core}
          /    \\
    ${dist1}      ${dist2}
    /  \\        /  \\
 ${access1}  ?    ${access2}  ?
`;
  },
};
