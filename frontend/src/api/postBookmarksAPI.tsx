import { mainAxios } from ".";
import { PostIDUserID, PostIDUserIDToken } from "../types/PostType";

export const addPostBookmark = (payload:PostIDUserIDToken):Promise<number>=> {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/postBookmarks/addBookmark/${payload.user_id}/${payload.post_id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${payload.token}`,
          },
        }
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

export const deletePostBookmark = (bookmark_id:number|null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.delete(
        `/postBookmarks/deleteBookmark/${bookmark_id}`,
        {},
      );
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};
