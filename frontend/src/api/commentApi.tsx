import { mainAxios } from ".";
import {
  CommentAddPayload,
  CommentDefaultResult,
  CommentDeleteResult,
  CommentPayload,
  CommentReplyChildArray,
  CommentUpdatePayload,
  CursorCommentDefault,
  ParentUserId,
} from "../types/CommentType";

//get comments by post id
export const getCommentsByPostId = (
  payload: CommentPayload,
): Promise<CursorCommentDefault> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/comments/GetCommentsByPostID/${payload.user_id}/${payload.post_id}?limit=${payload.limit}${payload.cursor ? `&cursor=${payload.cursor}` : ""}${payload.sort_by ? `&sortBy=${payload.sort_by}` : ""}`,
        "",
        {},
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

//get comments by post id
export const getReplyByCommentId = (
  payload: ParentUserId,
): Promise<CommentDefaultResult[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/comments/GetReplyByCommentID/${payload.user_id}/${payload.parent_comment_id}`,
        "",
        {},
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

export const addNewComment = (
  payload: CommentAddPayload,
): Promise<CommentDefaultResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/comments/AddNewComment/${payload.user_id}/${payload.post_id}/${payload.parent_comment_id}`,
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

export const updateComment = (
  payload: CommentUpdatePayload,
): Promise<CommentDefaultResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.put(
        `/comments/UpdateComment/${payload.comment_id}`,
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

export const deleteComment = (
  comment_id: number,
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.delete(
        `/comments/DeleteComment/${comment_id}`,
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
