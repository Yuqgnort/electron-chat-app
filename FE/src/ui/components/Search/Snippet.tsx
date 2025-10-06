import React, { JSX } from "react";

interface SnippetProps {
  text: string;
  keywords: string[];
  contextLength?: number; // Số ký tự hiển thị trước và sau keyword (mặc định: 50)
  noTruncate?: boolean; // Nếu true, hiển thị toàn bộ văn bản không cắt
}

/**
 * Loại bỏ dấu tiếng Việt và ký tự đặc biệt, chỉ giữ lại chữ cái và số
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Tìm vị trí match đầu tiên của keyword trong text
 */
function findFirstMatch(
  text: string,
  keywords: string[]
): { start: number; end: number } | null {
  if (!keywords.length || keywords.every((k) => !k.trim())) {
    return null;
  }

  const keywordString = keywords.join(" ").trim();
  if (!keywordString) return null;

  const normalizedKeyword = normalizeText(keywordString);
  const keywordLength = normalizedKeyword.length;

  if (keywordLength === 0) return null;

  let i = 0;
  while (i < text.length) {
    let matchLength = 0;
    let normalizedMatch = "";

    for (
      let j = i;
      j < text.length && normalizedMatch.length < keywordLength;
      j++
    ) {
      normalizedMatch += normalizeText(text[j]);
      matchLength++;

      if (normalizedMatch === normalizedKeyword) {
        return { start: i, end: i + matchLength };
      }
    }
    i++;
  }

  return null;
}

/**
 * Cắt text để lấy context xung quanh keyword
 */
function extractContext(
  text: string,
  matchStart: number,
  matchEnd: number,
  contextLength: number
): { snippet: string; offset: number; hasPrefix: boolean; hasSuffix: boolean } {
  // Tính toán vị trí bắt đầu và kết thúc của snippet
  let start = Math.max(0, matchStart - contextLength);
  let end = Math.min(text.length, matchEnd + contextLength);

  // Điều chỉnh để không cắt giữa từ
  // Tìm khoảng trắng gần nhất
  if (start > 0) {
    const spaceIndex = text.lastIndexOf(" ", start);
    if (spaceIndex > matchStart - contextLength - 20) {
      start = spaceIndex + 1;
    }
  }

  if (end < text.length) {
    const spaceIndex = text.indexOf(" ", end);
    if (spaceIndex !== -1 && spaceIndex < matchEnd + contextLength + 20) {
      end = spaceIndex;
    }
  }

  const snippet = text.substring(start, end);
  const hasPrefix = start > 0;
  const hasSuffix = end < text.length;

  return { snippet, offset: start, hasPrefix, hasSuffix };
}

/**
 * Highlight text với keywords trong snippet đã cắt
 */
function highlightInSnippet(
  snippet: string,
  keywords: string[],
  matchStart: number,
  matchEnd: number,
  offset: number
): JSX.Element[] {
  const keywordString = keywords.join(" ").trim();
  const normalizedKeyword = normalizeText(keywordString);
  const keywordLength = normalizedKeyword.length;

  // Điều chỉnh vị trí match theo offset
  const relativeStart = matchStart - offset;
  const relativeEnd = matchEnd - offset;

  const result: JSX.Element[] = [];
  let i = 0;
  let keyIndex = 0;

  while (i < snippet.length) {
    let matched = false;
    let matchLength = 0;
    let normalizedMatch = "";

    // Thử match từ vị trí hiện tại
    for (
      let j = i;
      j < snippet.length && normalizedMatch.length < keywordLength;
      j++
    ) {
      normalizedMatch += normalizeText(snippet[j]);
      matchLength++;

      if (normalizedMatch === normalizedKeyword) {
        const matchedText = snippet.substring(i, i + matchLength);
        result.push(
          <mark key={keyIndex++} className="bg-yellow-200 font-medium rounded">
            {matchedText}
          </mark>
        );
        i += matchLength;
        matched = true;
        break;
      }
    }

    if (!matched) {
      result.push(<span key={keyIndex++}>{snippet[i]}</span>);
      i++;
    }
  }

  return result;
}

const Snippet: React.FC<SnippetProps> = ({
  text,
  keywords,
  contextLength = 50,
  noTruncate = false,
}) => {
  if (!keywords.length) return <span className="text-sm">{text}</span>;

  // Xử lý keywords: nếu có 1 chuỗi với dấu + hoặc space, tách ra
  const processedKeywords = keywords.flatMap((keyword) =>
    keyword.split(/\s*\+\s*|\s+/).filter(Boolean)
  );

  // Nếu noTruncate = true, highlight toàn bộ văn bản
  if (noTruncate) {
    const keywordString = processedKeywords.join(" ").trim();
    const normalizedKeyword = normalizeText(keywordString);
    const keywordLength = normalizedKeyword.length;

    if (keywordLength === 0) return <span className="text-sm">{text}</span>;

    const result: JSX.Element[] = [];
    let i = 0;
    let keyIndex = 0;

    while (i < text.length) {
      let matched = false;
      let matchLength = 0;
      let normalizedMatch = "";

      for (
        let j = i;
        j < text.length && normalizedMatch.length < keywordLength;
        j++
      ) {
        normalizedMatch += normalizeText(text[j]);
        matchLength++;

        if (normalizedMatch === normalizedKeyword) {
          const matchedText = text.substring(i, i + matchLength);
          result.push(
            <mark
              key={keyIndex++}
              className="bg-yellow-200 font-medium rounded"
            >
              {matchedText}
            </mark>
          );
          i += matchLength;
          matched = true;
          break;
        }
      }

      if (!matched) {
        result.push(<span key={keyIndex++}>{text[i]}</span>);
        i++;
      }
    }

    return <span className="text-sm">{result}</span>;
  }

  // Tìm vị trí match đầu tiên
  const match = findFirstMatch(text, processedKeywords);

  // Nếu không tìm thấy match, hiển thị đoạn đầu
  if (!match) {
    const preview =
      text.length > contextLength * 2
        ? text.substring(0, contextLength * 2) + "..."
        : text;
    return <span className="text-sm">{preview}</span>;
  }

  // Cắt context xung quanh keyword
  const { snippet, offset, hasPrefix, hasSuffix } = extractContext(
    text,
    match.start,
    match.end,
    contextLength
  );

  // Highlight keywords trong snippet
  const highlighted = highlightInSnippet(
    snippet,
    processedKeywords,
    match.start,
    match.end,
    offset
  );

  return (
    <span className="text-sm">
      {hasPrefix && <span className="text-gray-400">...</span>}
      {highlighted}
      {hasSuffix && <span className="text-gray-400">...</span>}
    </span>
  );
};

export default Snippet;
