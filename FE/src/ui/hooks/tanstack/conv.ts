import { TBootstrapReturn } from "@/bootstrap";
import { useQuery } from "@tanstack/react-query";

export const GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID =
  "GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID";

export function useGetConvWithParticipantsByUserId(
  service: TBootstrapReturn["service"],
  userId: string
) {
  return useQuery({
    queryKey: [GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID, userId],
    queryFn: async () =>
      await service.conv.getConvsWithParticipantsByUserId(userId),
    enabled: !!userId,
  });
}
