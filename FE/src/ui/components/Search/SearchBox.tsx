import { useDebounce } from "@/ui/hooks/useDebounce";
import {
  useSearchExactPhraseQuery,
  useSearchMessagesQuery,
  type SearchResult,
} from "@/ui/hooks/useSearchMessages";
import { formatDistanceToNow } from "date-fns";
import { Filter, MessageSquare, Search, X } from "lucide-react";
import { JSX, useEffect, useRef, useState } from "react";
import { Button } from "../core/Button";
import { Checkbox } from "../core/Checkbox";
import { Input } from "../core/Input";
import { ScrollArea } from "../core/ScrollArea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../core/Select";

interface SearchBoxProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageClick?: (result: SearchResult, temp: string) => void;
}

export function SearchBox({ isOpen, onClose, onMessageClick }: SearchBoxProps) {
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [searchParams, setSearchParams] = useState({
    query: "",
    filters: { limit: 50, conversationId: undefined as string | undefined },
    isExactPhrase: false,
  });

  const debouncedSearchParams = useDebounce(searchParams, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    data: fuzzyResults = [],
    isFetching: isFetchingFuzzy,
    error: fuzzyError,
  } = useSearchMessagesQuery({
    query: debouncedSearchParams.query,
    filters: debouncedSearchParams.filters,
    enabled:
      !!debouncedSearchParams.query.trim() &&
      !debouncedSearchParams.isExactPhrase,
  });

  const {
    data: exactPhraseResults = [],
    isFetching: isFetchingExact,
    error: exactError,
  } = useSearchExactPhraseQuery({
    query: debouncedSearchParams.query,
    filters: debouncedSearchParams.filters,
    enabled:
      !!debouncedSearchParams.query.trim() &&
      debouncedSearchParams.isExactPhrase,
  });

  const activeResults = debouncedSearchParams.isExactPhrase
    ? exactPhraseResults
    : fuzzyResults;
  const fetchError = debouncedSearchParams.isExactPhrase
    ? exactError
    : fuzzyError;
  const isFetching = isFetchingFuzzy || isFetchingExact;
  const hasResults = activeResults.length > 0;
  const isEmpty =
    !hasResults && !isFetching && !!debouncedSearchParams.query.trim();

  console.log(activeResults);

  const handleClickMessage = (result: SearchResult, tempt: string) => {
    onMessageClick?.(result, tempt);
    onClose();
  };

  function normalizeForSearch(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD") // tách dấu
      .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
      .replace(/đ/g, "d")
      .replace(/\s+/g, " ")
      .trim();
  }

  // tạo mapping từ normalize sang text gốc
  function buildMapping(original: string) {
    const mapping: number[] = [];
    const normalized = [];

    let normIndex = 0;
    for (let i = 0; i < original.length; i++) {
      const c = original[i];
      const normC = c
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");

      for (let j = 0; j < normC.length; j++) {
        mapping[normIndex++] = i; // vị trí này trong normalize thuộc về original[i]
        normalized.push(normC[j]);
      }
    }
    return { normStr: normalized.join(""), mapping };
  }

  function highlight(text: string, keyword: string): JSX.Element {
    if (!keyword) return <>{text}</>;

    const { normStr, mapping } = buildMapping(text);
    const normKw = normalizeForSearch(keyword);

    const elements: JSX.Element[] = [];
    let lastOriginalIdx = 0;
    let key = 0;

    let idx = normStr.indexOf(normKw);
    while (idx !== -1) {
      const startOrig = mapping[idx];
      const endOrig = mapping[idx + normKw.length - 1] + 1;

      // phần trước match
      if (startOrig > lastOriginalIdx) {
        elements.push(
          <span key={key++}>{text.slice(lastOriginalIdx, startOrig)}</span>
        );
      }

      // highlight
      elements.push(
        <mark key={key++} className="bg-yellow-200">
          {text.slice(startOrig, endOrig)}
        </mark>
      );

      lastOriginalIdx = endOrig;
      idx = normStr.indexOf(normKw, idx + normKw.length);
    }

    // phần còn lại
    if (lastOriginalIdx < text.length) {
      elements.push(<span key={key++}>{text.slice(lastOriginalIdx)}</span>);
    }

    return <>{elements}</>;
  }

  const formatDate = (date: string) => {
    const timestamp = Number(date);
    const parsed = Number.isFinite(timestamp)
      ? new Date(timestamp)
      : new Date(date);
    return formatDistanceToNow(parsed, { addSuffix: true });
  };

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b p-4">
        <div className="flex justify-between items-center gap-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              ref={inputRef}
              type="text"
              value={searchParams.query}
              onChange={(e) =>
                setSearchParams((prev) => ({ ...prev, query: e.target.value }))
              }
              placeholder="Search messages..."
              className="w-full pl-10 pr-4"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFilterVisible((v) => !v)}
            className={isFilterVisible ? "bg-muted" : ""}
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        {isFilterVisible && (
          <div className="mt-3 flex items-center p-3 bg-muted rounded-lg space-x-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exactPhrase"
                checked={searchParams.isExactPhrase}
                onCheckedChange={(checked) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    isExactPhrase: Boolean(checked),
                  }))
                }
              />
              <label
                htmlFor="exactPhrase"
                className="text-sm text-muted-foreground"
              >
                Exact phrase
              </label>
            </div>
            <Select
              value={String(searchParams.filters.limit)}
              onValueChange={(val) =>
                setSearchParams((prev) => ({
                  ...prev,
                  filters: { ...prev.filters, limit: parseInt(val, 10) },
                }))
              }
            >
              <SelectTrigger className="w-[120px] h-7!">
                <SelectValue placeholder="Limit results" />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} results
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {isFetching && (
          <div className="p-8 text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Searching...</p>
          </div>
        )}
        {!isFetching && !debouncedSearchParams.query && (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-2">Search Messages</h3>
            <p>Type to search through your message history</p>
          </div>
        )}

        {!isFetching && isEmpty && (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-2">No messages found</h3>
            <p>Try different keywords or check your spelling</p>
          </div>
        )}

        {!isFetching && hasResults && (
          <ScrollArea className="h-full">
            <div className="px-4 py-2 text-sm font-medium border-b">
              {fetchError ? (
                <span className="text-destructive">
                  Error: {String(fetchError)}
                </span>
              ) : (
                `Found ${activeResults.length} message${
                  activeResults.length !== 1 ? "s" : ""
                }`
              )}
            </div>
            <div className="divide-y">
              {activeResults.map((msg) => (
                <div
                  key={`${msg.id}-${msg.conversation_id}`}
                  onClick={() => handleClickMessage(msg, searchParams.query)}
                  className="p-4 hover:bg-blue-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium">
                        {msg.sender_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-normal text-gray-500 text-sm">
                          {msg.sender_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm  line-clamp-2">
                        {highlight(msg.content, searchParams.query)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
