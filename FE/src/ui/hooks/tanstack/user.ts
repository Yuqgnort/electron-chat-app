import { TBootstrapReturn } from "@/bootstrap";
import { IConvEntity } from "@/core/domain/conv/entity";
import { IUserEntity } from "@/core/domain/user/entity";
import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query";

export const GET_ALL_USERS_QUERY_KEY = "GET_ALL_USERS";
export const GET_ALL_USERS_WITH_IGNORE_IDS_QUERY_KEY =
  "GET_ALL_USERS_WITH_IGNORE_IDS";
export const GET_CONV_BY_USER_IDS_QUERY_KEY = "GET_CONV_BY_USER_IDS";

export function useGetUsers(service: TBootstrapReturn["service"]) {
  return useQuery({
    queryKey: [GET_ALL_USERS_QUERY_KEY],
    queryFn: async () => await service.user.getAllUsers(),
  });
}

export function useGetUsersWithIgnoreIds(
  service: TBootstrapReturn["service"],
  ignoredIds: string[]
) {
  return useQuery({
    queryKey: [GET_ALL_USERS_WITH_IGNORE_IDS_QUERY_KEY, ignoredIds],
    queryFn: async () => await service.user.getAllUsersIgnore(ignoredIds),
  });
}

export function useGetUserById(service: TBootstrapReturn["service"]) {
  return useMutation({
    mutationKey: ["GET_USER_BY_ID"],
    mutationFn: async (id: string) => {
      if (!id) {
        throw new Error("User ID is not provided");
      }
      const user = await service.user.getUserById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }
      return user;
    },
  });
}
