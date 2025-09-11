import { IMsgEntity } from "./entity";

export type TMsgEvents =
  | { type: "MsgCreated"; payload: IMsgEntity }
  | { type: "MsgUpdated"; payload: IMsgEntity };
