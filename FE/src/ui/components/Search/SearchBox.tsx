import {
  ESearchType,
  ISearchQuery,
  ISearchRawResultItem,
} from "@/core/domain/search/entity";
import { useAppContext } from "@/ui/context";
import { useCurrentUserStore } from "@/ui/hooks/store/useCurrentUser";
import { useGetUsers } from "@/ui/hooks/tanstack/user";
import { useDebounce } from "@/ui/hooks/useDebounce";
import {
  useInfiniteSearchExactPhraseQuery,
  useInfiniteSearchQuery,
} from "@/ui/hooks/useInfiniteSearchMessages";
import { formatDistanceToNow } from "date-fns";
import { Filter, Loader, MessageSquare, Search, X } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../core/Button";
import { Input } from "../core/Input";
import FilterPanel from "./FilterPanel";
import Snippet from "./Snippet";

interface SearchBoxProps {
  isOpen: boolean;
  onClose: () => void;
  onMessageClick?: (result: ISearchRawResultItem, temp: string) => void;
}

type SearchItemProps = {
  msg: ISearchRawResultItem;
  handleClickMessage: (result: ISearchRawResultItem, temp: string) => void;
  searchParams: ISearchQuery;
  currentUser: { id: string };
};

const formatDate = (date: string | number) => {
  const timestamp = Number(date);
  const parsed = Number.isFinite(timestamp)
    ? new Date(timestamp)
    : new Date(date);
  return formatDistanceToNow(parsed, { addSuffix: true });
};

const SearchItem = memo(function SearchItem({
  msg,
  handleClickMessage,
  searchParams,
  currentUser,
}: SearchItemProps) {
  return (
    <div
      key={`${msg.id}-${msg.conversationId}`}
      onClick={() => handleClickMessage(msg, searchParams.query)}
      className="p-4 hover:bg-blue-100 cursor-pointer transition-colors"
    >
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">
            {(msg.senderId === currentUser.id
              ? msg.receiverName
              : msg.senderName
            )
              .charAt(0)
              .toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-normal text-gray-500 text-sm">
              {msg.senderId === currentUser.id
                ? msg.receiverName
                : msg.senderName}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(msg.createdAt)}
            </span>
          </div>
          <div className="flex items-start gap-1 line-clamp-1 w-full">
            {msg.senderId === currentUser.id && (
              <p className="font-medium text-sm">You:</p>
            )}
            <Snippet text={msg.content} keywords={[searchParams.query]} />
          </div>
        </div>
      </div>
    </div>
  );
});

export function SearchBox({ isOpen, onClose, onMessageClick }: SearchBoxProps) {
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const { service } = useAppContext();
  const { currentUser } = useCurrentUserStore();

  const [searchParams, setSearchParams] = useState<ISearchQuery>({
    currentUserId: currentUser?.id || "",
    limit: 100,
    type: ESearchType.FULL_TEXT,
    query: "",
    userId: undefined,
    endDate: undefined,
    startDate: undefined,
  });

  const { data: users = [] } = useGetUsers(service);

  const debouncedSearchParams = useDebounce(searchParams, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll maintenance refs
  const lastScrollTop = useRef(0);
  const previousScrollHeight = useRef(0);
  const shouldMaintainScroll = useRef(false);

  const {
    data: fuzzyResults,
    isFetching: isFetchingFuzzy,
    isFetchingNextPage: isFetchingNextPageFuzzy,
    hasNextPage: hasNextPageFuzzy,
    fetchNextPage: fetchNextPageFuzzy,
    error: fuzzyError,
  } = useInfiniteSearchQuery({
    query: debouncedSearchParams,
  });

  const {
    data: exactPhraseResults,
    isFetching: isFetchingExact,
    isFetchingNextPage: isFetchingNextPageExact,
    hasNextPage: hasNextPageExact,
    fetchNextPage: fetchNextPageExact,
    error: exactError,
  } = useInfiniteSearchExactPhraseQuery({
    query: debouncedSearchParams,
  });

  const isExactPhrase = debouncedSearchParams.type === ESearchType.EXACT_PHRASE;

  const activeResults = useMemo(() => {
    const data = isExactPhrase ? exactPhraseResults : fuzzyResults;
    return data?.pages.flatMap((page) => page.items) || [];
  }, [isExactPhrase, exactPhraseResults, fuzzyResults]);

  const fetchError = isExactPhrase ? exactError : fuzzyError;
  const isFetchingInitial =
    (isFetchingFuzzy || isFetchingExact) && activeResults.length === 0;
  const isFetchingNextPage = isFetchingNextPageFuzzy || isFetchingNextPageExact;
  const hasNextPage = isExactPhrase ? hasNextPageExact : hasNextPageFuzzy;
  const fetchNextPage = isExactPhrase ? fetchNextPageExact : fetchNextPageFuzzy;

  const hasResults = activeResults && activeResults.length > 0;
  const isEmpty =
    !hasResults && !isFetchingInitial && !!debouncedSearchParams.query.trim();

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    if (
      scrollHeight - scrollTop - clientHeight < 200 &&
      scrollTop > lastScrollTop.current &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      shouldMaintainScroll.current = true;
      previousScrollHeight.current = scrollHeight;
      await fetchNextPage();
    }
    lastScrollTop.current = scrollTop;
  };

  useEffect(() => {
    if (shouldMaintainScroll.current && scrollRef.current) {
      const currentScrollHeight = scrollRef.current.scrollHeight;
      const scrollDiff = currentScrollHeight - previousScrollHeight.current;
      if (scrollDiff > 0) {
        scrollRef.current.scrollTop = lastScrollTop.current + scrollDiff;
      }
      shouldMaintainScroll.current = false;
      previousScrollHeight.current = 0;
    }
  }, [exactPhraseResults, fuzzyResults]);

  const handleClickMessage = (result: ISearchRawResultItem, tempt: string) => {
    onMessageClick?.(result, tempt);
    onClose();
  };

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

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
          <FilterPanel
            users={users || []}
            currentUser={currentUser}
            isFilterVisible={isFilterVisible}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            setIsFilterVisible={setIsFilterVisible}
          />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {isFetchingInitial && (
          <div className="p-8 text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Searching...</p>
          </div>
        )}
        {!isFetchingInitial && !debouncedSearchParams.query && (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-2">Search Messages</h3>
            <p>Type to search through your message history</p>
          </div>
        )}
        {!isFetchingInitial && isEmpty && (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium mb-2">No messages found</h3>
            <p>Try different keywords or check your spelling</p>
          </div>
        )}
        {hasResults && (
          <div className="h-full overflow-hidden">
            <div className="px-4 py-2 text-sm font-medium border-b">
              {fetchError ? (
                <span className="text-destructive">
                  Error: {String(fetchError)}
                </span>
              ) : (
                <div className="flex items-center justify-between">
                  <span>
                    Found{" "}
                    {activeResults.length >= 100 ? "99+" : activeResults.length}{" "}
                    message
                    {activeResults.length !== 1 ? "s" : ""}
                    {isFetchingInitial && (
                      <span className="ml-2">
                        <Loader className="inline w-3 h-3 animate-spin" />
                      </span>
                    )}
                  </span>
                  {hasNextPage && (
                    <span className="text-xs text-muted-foreground">
                      Scroll for more results
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto"
              style={{ maxHeight: "calc(100% - 60px)" }}
            >
              <div className="divide-y">
                {activeResults.map((msg: ISearchRawResultItem) => (
                  <SearchItem
                    key={`${msg.id}-${msg.conversationId}`}
                    msg={msg}
                    handleClickMessage={handleClickMessage}
                    searchParams={searchParams}
                    currentUser={currentUser}
                  />
                ))}

                {isFetchingNextPage && (
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Loading more results...
                      </span>
                    </div>
                  </div>
                )}

                {!hasNextPage && activeResults.length > 0 && (
                  <div className="p-4 text-center">
                    <span className="text-xs text-muted-foreground">
                      No more results
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
