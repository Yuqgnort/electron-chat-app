import { ESearchType, ISearchQuery } from "@/core/domain/search/entity";
import { IUserEntity } from "@/core/domain/user/entity";
import { endOfMonth, format, parse, startOfMonth, subMonths } from "date-fns";
import { Calendar, User, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../core/Button";
import { Checkbox } from "../core/Checkbox";
import { Input } from "../core/Input";
import { Popover, PopoverContent, PopoverTrigger } from "../core/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../core/Select";

export type TFilterPanelProps = {
  currentUser: IUserEntity;
  users: IUserEntity[];
  searchParams: ISearchQuery;
  setSearchParams: React.Dispatch<React.SetStateAction<ISearchQuery>>;
  isFilterVisible: boolean;
  setIsFilterVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

export function normalizeMonthRange(range: { from: string; to: string }) {
  const fromDate = parse(range.from, "yyyy-MM", new Date());
  const toDate = parse(range.to, "yyyy-MM", new Date());

  return {
    from: format(startOfMonth(fromDate), "yyyy-MM-dd"),
    to: format(endOfMonth(toDate), "yyyy-MM-dd"),
  };
}

export function denormalizeMonthRange(range: { from: string; to: string }) {
  const fromDate = parse(range.from, "yyyy-MM-dd", new Date());
  const toDate = parse(range.to, "yyyy-MM-dd", new Date());

  return {
    from: format(fromDate, "yyyy-MM"),
    to: format(toDate, "yyyy-MM"),
  };
}

const currentMonth = new Date();
const prevMonth = subMonths(currentMonth, 1);
const initialDateRange = {
  from: format(prevMonth, "yyyy-MM"),
  to: format(currentMonth, "yyyy-MM"),
};

export default function FilterPanel({
  users,
  currentUser,
  setSearchParams,
  searchParams,
  isFilterVisible,
  setIsFilterVisible,
}: TFilterPanelProps) {
  const [tempDateRange, setTempDateRange] = useState(initialDateRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (isDatePickerOpen && searchParams.startDate && searchParams.endDate) {
      setTempDateRange(
        denormalizeMonthRange({
          from: searchParams.startDate,
          to: searchParams.endDate,
        })
      );
    }
  }, [isDatePickerOpen, searchParams.startDate, searchParams.endDate]);

  const handleSelectUser = (value: string) => {
    setSearchParams((prev) => ({
      ...prev,
      userId: value,
    }));
  };

  const handleClearUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectUser("");
  };

  const handleClearDateRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchParams((prev) => ({
      ...prev,
      startDate: undefined,
      endDate: undefined,
    }));
    setTempDateRange(initialDateRange);
  };

  const handleApplyDateRange = () => {
    const normalized = normalizeMonthRange(tempDateRange);
    setSearchParams((prev) => ({
      ...prev,
      startDate: normalized.from,
      endDate: normalized.to,
    }));
    setIsDatePickerOpen(false);
  };

  const formatDateRange = () => {
    const { startDate, endDate } = searchParams;
    if (!startDate && !endDate) return null;

    const formatOptions: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
    };

    const start = startDate
      ? new Date(startDate).toLocaleDateString("en-US", formatOptions)
      : null;
    const end = endDate
      ? new Date(endDate).toLocaleDateString("en-US", formatOptions)
      : null;

    if (start && end) return `${start} - ${end}`;
    if (start) return `From ${start}`;
    if (end) return `To ${end}`;
  };

  const hasActiveFilters =
    searchParams.userId ||
    searchParams.startDate ||
    searchParams.endDate ||
    searchParams.type === ESearchType.EXACT_PHRASE;

  const handleClearAllFilters = () => {
    setSearchParams((prev) => ({
      ...prev,
      userId: "",
      startDate: undefined,
      endDate: undefined,
      type: ESearchType.FULL_TEXT,
    }));
    setTempDateRange({ from: "", to: "" });
  };

  if (!isFilterVisible) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow transition-shadow">
          <Checkbox
            id="exactPhrase"
            checked={searchParams.type === ESearchType.EXACT_PHRASE}
            onCheckedChange={(checked) =>
              setSearchParams((prev) => ({
                ...prev,
                type: checked
                  ? ESearchType.EXACT_PHRASE
                  : ESearchType.FULL_TEXT,
              }))
            }
          />
          <label
            htmlFor="exactPhrase"
            className="text-sm font-medium text-slate-700 cursor-pointer select-none"
          >
            Exact phrase
          </label>
        </div>
        <div className="relative">
          <Select value={searchParams.userId} onValueChange={handleSelectUser}>
            <SelectTrigger className="w-full h-10 bg-white border-slate-200 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <SelectValue placeholder="Select user" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {users?.map((u) => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{u.id === currentUser.id ? "You" : u.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {searchParams.userId && (
            <button
              onClick={handleClearUser}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-white hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Clear user filter"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>
        <div className="relative col-span-2">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-10 justify-start text-left font-normal w-full bg-white border-slate-200 shadow-sm hover:shadow transition-shadow"
              >
                <Calendar className="mr- h-4 w-4 text-slate-400" />
                {formatDateRange() || (
                  <span className="text-slate-500">Pick date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4 space-y-4 bg-white rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    From Date
                  </label>
                  <Input
                    type="month"
                    value={tempDateRange.from}
                    max={tempDateRange.to || undefined}
                    onChange={(e) => {
                      setTempDateRange((prev) => ({
                        ...prev,
                        from: e.target.value,
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    To Date
                  </label>
                  <Input
                    type="month"
                    value={tempDateRange.to}
                    min={tempDateRange.from || undefined}
                    onChange={(e) =>
                      setTempDateRange((prev) => ({
                        ...prev,
                        to: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleApplyDateRange}
                    className="flex-1"
                    disabled={!tempDateRange.from && !tempDateRange.to}
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTempDateRange({ from: "", to: "" });
                      setIsDatePickerOpen(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {(searchParams.startDate || searchParams.endDate) && (
            <button
              onClick={handleClearDateRange}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Clear date range"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>
      </div>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAllFilters}
          className="ml-auto text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
        >
          <X className="w-4 h-4 mr-1" />
          Clear all
        </Button>
      )}
    </div>
  );
}
