/**
 * Professional markdown renderer — converts LLM output to clean HTML.
 * Handles: headings, bold, bullet points, numbered lists, arrows, paragraphs.
 * No emojis, no raw asterisks.
 */

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  const parseLine = (line: string): React.ReactNode => {
    // Replace **text** with <strong>
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, idx) =>
      idx % 2 === 1
        ? <strong key={idx} className="font-semibold text-white">{part}</strong>
        : <span key={idx}>{part}</span>
    );
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // Skip empty lines — add spacing
    if (!line) {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // H1: # Heading
    if (/^# (.+)/.test(line)) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-white mt-4 mb-1 border-b border-gray-800 pb-1">
          {line.replace(/^# /, '')}
        </h2>
      );
      i++;
      continue;
    }

    // H2: ## Heading
    if (/^## (.+)/.test(line)) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-gray-200 mt-3 mb-1">
          {line.replace(/^## /, '')}
        </h3>
      );
      i++;
      continue;
    }

    // H3: ### Heading
    if (/^### (.+)/.test(line)) {
      elements.push(
        <h4 key={i} className="text-sm font-semibold text-gray-300 mt-2 mb-1">
          {line.replace(/^### /, '')}
        </h4>
      );
      i++;
      continue;
    }

    // Bold-only line acting as heading (e.g. "**Key Points:**")
    if (/^\*\*[^*]+\*\*:?\s*$/.test(line)) {
      const text = line.replace(/\*\*/g, '').replace(/:$/, '');
      elements.push(
        <p key={i} className="text-sm font-semibold text-gray-200 mt-3 mb-1">
          {text}
        </p>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      elements.push(<hr key={i} className="border-gray-800 my-3" />);
      i++;
      continue;
    }

    // Numbered list: "1. item" or "1) item"
    if (/^\d+[.)]\s/.test(line)) {
      // Collect consecutive numbered items
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 my-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="flex-shrink-0 w-5 h-5 rounded bg-blue-600/20 text-blue-400 text-xs flex items-center justify-center font-medium mt-0.5">
                {idx + 1}
              </span>
              <span>{parseLine(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet list: "- item" or "• item" or "* item"
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
              <span>{parseLine(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Arrow list: "-> item" or "=> item"
    if (/^[-=]>\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-=]>\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-=]>\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`arr-${i}`} className="space-y-1 my-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="flex-shrink-0 text-blue-400 mt-0.5 font-medium leading-5">›</span>
              <span>{parseLine(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Table row (starts with |)
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim()
          .split('|')
          .filter(Boolean)
          .map(cell => cell.trim());
        if (!row.every(c => /^[-:]+$/.test(c))) {
          rows.push(row);
        }
        i++;
      }
      if (rows.length > 0) {
        elements.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  {rows[0].map((cell, ci) => (
                    <th key={ci} className="text-left px-3 py-2 text-gray-400 font-semibold">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-800/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-gray-300">{parseLine(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm text-gray-300 leading-relaxed">
        {parseLine(line)}
      </p>
    );
    i++;
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      {elements}
    </div>
  );
}
