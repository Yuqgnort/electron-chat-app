import { IConvPartEntity } from "./entity";

/////////////////

export type TConvPartEvents = {
  type: "ConvPartCreated";
  payload: IConvPartEntity;
};
