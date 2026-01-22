import { mainAxios } from ".";
import { VoteCountType, VoteTypePostVote, VoteTypeUserPost } from "../types/VoteType";

export const addPostVote = (payload: VoteTypeUserPost):Promise<number>=> {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/postVotes/addVote/${payload.user_id}/${payload.post_id}`,
        payload,
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

export const updatePostVote = (payload: VoteTypePostVote):Promise<VoteCountType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.put(
        `/postVotes/updateVote/${payload.post_vote_id}`,
        payload,
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

export const deletePostVote = (post_vote_id:number|null):Promise<VoteCountType> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.delete(
        `/postVotes/deleteVote/${post_vote_id}`,
        {},
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
