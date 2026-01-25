import { mainAxios } from ".";
import { IDLimitCursorSearch } from "../types/PostType";
import { CursorTopicDefault, TopicDefaultResult, TopicURLUserID, TopicUserID } from "../types/TopicsType";
import { SearchLimitOffset } from "../types/UtilsType";

export const getTopicsByPopularityAndSearch = (
  payload: IDLimitCursorSearch,
): Promise<CursorTopicDefault> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(
        `/topics/GetAllTopics/${payload.user_id}?limit=${payload.limit}&search=${payload.search}${payload.cursor ? `&cursor=${payload.cursor}` : ""}${payload.filter ? `&sortBy=${payload.filter}` : ""}`,
        payload,
      );
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};

export const getTopicByID = (
 payload: TopicUserID,
): Promise<TopicDefaultResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(`/GetTopicByID/${payload.topic_id}/${payload.user_id}`, "", {});
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};



export const getTopicByURL = (
 payload: TopicURLUserID,
): Promise<TopicDefaultResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await mainAxios.post(`/GetTopicByURL/${payload.user_id}/${payload.topic_url}`, "", {});
      resolve(result.data);
    } catch (error) {
      reject(error);
    }
  });
};
