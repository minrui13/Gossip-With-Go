import { mainAxios } from ".";
import {
  PostDefaultResultType,
  PostPopularityFollowResultType,
} from "../types/PostType";
import {
    IDLimitOffsetSearch,
  IDLimitOffsetToken,
  IDLimitOffsetTokenSearch,
} from "../types/UtilsType";

// Get post By popularity and searching
export const getPostsByPopularityAndSearch = (
  payload: IDLimitOffsetSearch
): Promise<PostPopularityFollowResultType[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/allPostsByFilter/${payload.user_id}?limit=${payload.limit}&offset=${payload.offset}&search=${payload.search}`,
       {}
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
  payload: IDLimitOffsetToken
): Promise<PostPopularityFollowResultType[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/getPostsByPopularityAndFollow/${payload.user_id}?limit=${payload.limit}&offset=${payload.offset}`,
        {},
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

export const getPostsByFollow = (
  payload: IDLimitOffsetToken
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
        }
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
