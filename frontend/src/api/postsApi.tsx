import { mainAxios } from ".";
import {
  CursorPostDefault,
  CursorPostDefaultIsFollowing,
  CursorPostDefaultSumVote,
  IDLimitCursorSearch,
  IDLimitCursorSearchToken,
  PostAddPayload,
  PostDefaultResultType,
  PostIDUserID,
  PostUpdate,
  PostUpdatePayload,
  PostURLUserID,
  TopicIDLimitCursor,
} from "../types/PostType";

// Get post By popularity and searching
export const getPostsByPopularityAndSearch = (
  payload: IDLimitCursorSearch,
): Promise<CursorPostDefault> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/allPostsByFilter/${payload.user_id}?limit=${payload.limit}&search=${payload.search}${payload.cursor ? `&cursor=${payload.cursor}` : ""}${payload.filter ? `&sortBy=${payload.filter}` : ""}`,
        {},
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

// Get post By topic id
export const getPostsByTopicID = (
  payload: TopicIDLimitCursor,
): Promise<CursorPostDefault> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/allPostsByTopic/${payload.topic_id}/${payload.user_id}?limit=${payload.limit}&search=${payload.search}${payload.cursor ? `&cursor=${payload.cursor}` : ""}${payload.filter ? `&sortBy=${payload.filter}` : ""}`,
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
): Promise<CursorPostDefaultIsFollowing> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/getPostsByPopularityAndFollow/${payload.user_id}?limit=${payload.limit}${payload.cursor ? `&cursor=${payload.cursor}` : ""}${payload.filter ? `&sortBy=${payload.filter}` : ""}`,
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

// get posts from users that the user follows
export const getPostsByFollow = (
  payload: IDLimitCursorSearchToken,
): Promise<CursorPostDefault> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/getPostsByFollow/${payload.user_id}?limit=${payload.limit}${payload.cursor ? `&cursor=${payload.cursor}` : ""}${payload.filter ? `&sortBy=${payload.filter}` : ""}`,
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

// Get post By ID
export const getPostByID = (
  payload: PostIDUserID,
): Promise<PostDefaultResultType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/getPostByID/${payload.user_id}/${payload.post_id}`,
        {
          params: payload,
        },
        {},
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

//  Get post by URL
export const getPostByURL = (
  payload: PostURLUserID,
): Promise<PostDefaultResultType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/getPostByURL/${payload.user_id}/${payload.post_url}`,
        {},
        {},
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

// Add post
export const addPost = (
  payload: PostAddPayload,
): Promise<PostDefaultResultType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/posts/addPost/${payload.topic_id}/${payload.user_id}`,
        payload,
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

// Update post
export const updatePost = (payload: PostUpdatePayload): Promise<PostUpdate> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.put(
        `/posts/updatePost/${payload.post_id}`,
        payload,

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

// Delete post
export const deletePost = (post_id: number): Promise<{ post_id: number }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.delete(`/posts/deletePost/${post_id}`);
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
