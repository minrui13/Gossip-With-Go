import { mainAxios } from ".";
import { ProfileImageType } from "../types/SignUpType";

export const getAllImages = (): Promise<ProfileImageType[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.get(`/images/`);
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
