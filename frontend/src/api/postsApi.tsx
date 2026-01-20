import { mainAxios } from ".";
import {
  CursorPostDefault,
  CursorPostDefaultSumVote,
  IDLimitCursorSearch,
  IDLimitCursorSearchToken,
  PostDefaultResultType,
} from "../types/PostType";

// Get post By popularity and searching
export const getPostsByPopularityAndSearch = (
  payload: IDLimitCursorSearch,
): Promise<CursorPostDefault> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/allPostsByFilter/${payload.user_id}?limit=${payload.limit}&search=${payload.search}${payload.cursor ? `&cursor=${payload.cursor}` : ""}`,
        {},
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

// main page for login user
// get posts from topics that are under same categories of the topics user follows as well as the most popular posts
// only if user folllows topics with limits
export const getPostsByFollowAndPopularity = (
  payload: IDLimitCursorSearchToken,
): Promise<CursorPostDefaultSumVote> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/getPostsByPopularityAndFollow/${payload.user_id}?limit=${payload.limit}${payload.cursor ? `&cursor=${payload.cursor}` : ""}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${payload.token}`,
          },
        },
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

export const getPostsByFollow = (
  payload: IDLimitCursorSearchToken,
): Promise<PostDefaultResultType[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/getPostsByFollow/${payload.user_id}`,
        {
          params: payload,
        },
        {
          headers: {
            Authorization: `Bearer ${payload.token}`,
          },
        },
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
