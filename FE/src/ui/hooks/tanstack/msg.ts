import { TBootstrapReturn } from "@/bootstrap";
import { useQuery } from "@tanstack/react-query";

export const GET_MESSAGE_BY_CONV_ID_QUERY_KEY = "GET_MESSAGE_BY_CONV_ID";

export const useGetMessagesByConvId = (
  service: TBootstrapReturn["service"],
  convId?: string
) => {
  return useQuery({
    queryKey: [GET_MESSAGE_BY_CONV_ID_QUERY_KEY, convId],
    queryFn: async () => await service.msg.getMsgsByConvId(convId),
    enabled: !!convId,
  });
};
