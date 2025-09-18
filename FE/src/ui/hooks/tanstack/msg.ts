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
  limit: number = 20,
  direction: TMsgDirection = "older"
) => {
  return useInfiniteQuery({
    queryKey: [GET_MESSAGE_BY_CONV_ID_QUERY_KEY, convId, limit, direction],
    queryFn: async ({ pageParam }) =>
      await service.msg.getMsgsByConvId(
        convId!,
        limit,
        direction,
        pageParam || null
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    enabled: !!convId,
    select: (data) => {
      const rs = mergeKSortedArrays<IMsgEntity>({
        arrays: data?.pages.map((page) => page?.data ?? []) || [],
        compareFn: (a, b) => a.createdAt - b.createdAt,
      });

      return rs;
    },
  });
};
