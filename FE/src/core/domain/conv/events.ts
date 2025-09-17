import { IConvEntity } from "./entity";

/////////////////

export type TConvEvents =
  | { type: "ConvCreated"; payload: IConvEntity }
  | {
      type: "ConvLastMessageChanged";
      payload: IConvEntity;
    };
