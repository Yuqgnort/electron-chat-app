import { TBootstrapReturn } from "@/bootstrap";
import { IMsgEntity, TMsgDirection } from "@/core/domain/msg/entity";
import { mergeKSortedArrays } from "@/ui/helper";
import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query";

export type TGetMessagesByConvIdResponse = Awaited<
  ReturnType<TBootstrapReturn["service"]["msg"]["getMsgsByConvId"]>
>;

export type TGetMessagesByConvIdQueryData =
  InfiniteData<TGetMessagesByConvIdResponse>;

export const GET_MESSAGE_BY_CONV_ID_QUERY_KEY = "GET_MESSAGE_BY_CONV_ID";

export const useGetMessagesByConvId = (
  service: TBootstrapReturn["service"],
  convId: string | null,
  limit: number = 50,
  initialCursor: number | null = null,
  enabled: boolean = true
) => {
  return useInfiniteQuery({
    queryKey: [GET_MESSAGE_BY_CONV_ID_QUERY_KEY, convId, limit],
    queryFn: async ({ pageParam }) => {
      const rs = await service.msg.getMsgsByConvId(
        convId!,
        limit,
        pageParam.direction,
        pageParam.cursor
      );

      return rs;
    },
    initialPageParam: {
      cursor: initialCursor,
      direction: initialCursor ? "around" : ("latest" as TMsgDirection),
    },
    getNextPageParam: (lastPage) => {
      return lastPage?.nextCursor
        ? { cursor: lastPage.nextCursor, direction: "older" as TMsgDirection }
        : null;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage?.prevCursor
        ? { cursor: firstPage.prevCursor, direction: "newer" as TMsgDirection }
        : null;
    },
    enabled: !!convId && enabled,
    select: (data) => {
      console.log("All pages data:", data);
      return mergeKSortedArrays<IMsgEntity>({
        arrays: data?.pages.map((page) => page?.data ?? []) || [],
        compareFn: (a, b) => a.createdAt - b.createdAt,
      });
    },
  });
};
