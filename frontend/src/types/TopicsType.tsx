export type TopicDefaultResult = {
  topic_id: number;
  topic_user_id: number;
  username: string;
  display_name: string;
  image_name: string;
  topic_name: string;
  topic_url: string;
  description: string;
  visibility: string;
  created_date: string;
  category_name: string;
  category_icon: string;
  followers_count: number;
  posts_count: number;
  is_following: boolean;
};

export type TopicUserID = {
  topic_id: number;
  user_id: number;
};

export type TopicURLUserID = {
  topic_url: string;
  user_id: number;
};

export type CursorTopicDefault = {
  result: TopicDefaultResult[];
  cursor: string | null;
};

export type TopicProp = {
  topicData: TopicDefaultResult;
};
