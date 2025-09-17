import { TID, TTimeStamp } from "../type";

export enum EUserGender {
  MALE = "male",
  OTHER = "other",
  FEMALE = "female",
}

export interface IUserEntity {
  id: TID;
  dob: string;
  bio: string;
  name: string;
  userName: string;
  createdAt: TTimeStamp;
  displayName: string;
  gender: EUserGender;
}
