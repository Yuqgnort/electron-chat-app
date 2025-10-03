import { createNormalizeSearchString } from "@/core/domain/search/entity";
import React from "react";
import Highlighter from "react-highlight-words";

interface SnippetProps {
  text: string;
  keywords: string[];
  radius?: number;
}

const Snippet: React.FC<SnippetProps> = ({ text, keywords, radius = 30 }) => {
  const normalizedText = createNormalizeSearchString(text);
  const normalizedKeywords = keywords.map(createNormalizeSearchString);

  let firstMatchIndex = -1;
  let matchWord = "";

  for (const kw of normalizedKeywords) {
    const regex = new RegExp(`\\b${kw}`, "i");
    const match = normalizedText.match(regex);
    if (match && (firstMatchIndex === -1 || match.index! < firstMatchIndex)) {
      firstMatchIndex = match.index!;
      matchWord = kw;
    }
  }

  if (firstMatchIndex === -1) {
    return <span>{text.slice(0, radius)}...</span>;
  }

  const start = Math.max(firstMatchIndex - radius, 0);
  const end = Math.min(
    firstMatchIndex + matchWord.length + radius,
    text.length
  );
  const snippet = text.slice(start, end);

  const displayText =
    (start > 0 ? "..." : "") + snippet + (end < text.length ? "..." : "");

  return (
    <Highlighter
      highlightClassName="bg-yellow-200"
      className="text-sm line-clamp-1"
      searchWords={[...keywords, ...keywords.map(createNormalizeSearchString)]}
      autoEscape={true}
      textToHighlight={displayText}
    />
  );
};

export default Snippet;
