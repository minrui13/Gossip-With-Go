import { SearchLimitOffset } from "./UtilsType";

export type PostDefaultResultType = {
  post_id: number;
  user_id: number;
  username: string;
  user_image: string;
  topic_name: string;
  category_icon: string;
  tag_name: string | null;
  tag_icon: string |null;
  tag_description: string |null;
  title: string;
  content: string;
  created_date: string;
  vote_id : number;
  upvote_count: number;
  downvote_count: number;
  vote_status: number|null;
  comment_count: number;
  bookmark_id: number;
  is_bookmarked: boolean;
};

export type PostPopularityFollowResultType = {
  post_id: number;
  user_id: number;
  username: string;
  user_image: string;
  topic_name: string;
  category_icon: string;
  tag_name: string | null;
  tag_icon: string | null;
  tag_description: string | null;
  title: string;
  content: string;
  created_date: string;
  vote_id: number;
  upvote_count: number;
  downvote_count: number;
  sum_count: number;
  vote_status: number|null;
  comment_count: number;
  bookmark_id: number;
  is_bookmarked: boolean;
};
