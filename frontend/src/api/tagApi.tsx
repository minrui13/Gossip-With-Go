import { mainAxios } from ".";
import { TagDefaultType } from "../types/TagType";

export const getAllTags = (): Promise<TagDefaultType[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.get(`/tags/`);
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
