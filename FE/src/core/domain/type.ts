export type TTimeStamp = number;
export type TID = string;

export type TPaginationResult<T, U> = {
  data: T[];
  nextCursor?: U | null;
  prevCursor?: U | null;
};
