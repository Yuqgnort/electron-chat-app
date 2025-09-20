import { TBootstrapReturn } from "@/bootstrap";
import { IConvEntity } from "@/core/domain/conv/entity";
import { IUserEntity } from "@/core/domain/user/entity";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query";

export const GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID =
  "GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID";

export function useGetConvWithParticipantsByUserId(
  service: TBootstrapReturn["service"],
  userId?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [GET_CONV_WITH_OTHER_PARTICIPANTS_BY_USER_ID, userId],
    queryFn: async () =>
      await service.conv.getConvsWithParticipantsByUserId(userId!),
    enabled: !!userId && enabled,
    gcTime: 0,
    staleTime: 0,
  });
}

export function useGetConvByUserIds(
  service: TBootstrapReturn["service"],
  options?: Omit<
    UseMutationOptions<IConvEntity | null, Error, string[], unknown>,
    "mutationFn"
  >
) {
  return useMutation({
    mutationFn: async (userIds: IUserEntity["id"][]) =>
      await service.conv.getConvByUserIds(userIds),
    ...options,
  });
}
