import { mainAxios } from ".";
import {
  VoteCountType,
  VoteCountTypeVoteID,
  VoteTypeCommentVote,
  VoteTypePostVote,
  VoteTypeUserComment,
  VoteTypeUserPost,
} from "../types/VoteType";

export const addCommentVote = (payload: VoteTypeUserComment):  Promise<VoteCountTypeVoteID> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/commentVotes/addVote/${payload.user_id}/${payload.comment_id}`,
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

export const updateCommentVote = (
  payload: VoteTypeCommentVote,
): Promise<VoteCountType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.put(
        `/commentVotes/updateVote/${payload.comment_vote_id}`,
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

export const deleteCommentVote = (
  comment_vote_id: number | null,
): Promise<VoteCountType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.delete(
        `/commentVotes/deleteVote/${comment_vote_id}`,
        {},
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
