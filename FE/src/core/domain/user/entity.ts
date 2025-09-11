export enum EUserGender {
  MALE = "male",
  OTHER = "other",
  FEMALE = "female",
}

export interface IUserEntity {
  id: string;
  dob: string;
  bio: string;
  name: string;
  userName: string;
  createdAt: string;
  displayName: string;
  gender: EUserGender;
}
