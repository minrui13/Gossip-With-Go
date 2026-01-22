import { SearchLimitOffset } from "./UtilsType";

export type PostDefaultResultType = {
  post_id: number;
  post_url: string;
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
  vote_id: number | null;
  upvote_count: number;
  downvote_count: number;
  vote_status: number | null;
  comment_count: number;
  bookmark_id: number | null;
  is_bookmarked: boolean;
};

export type PostSumVotesResultType = PostDefaultResultType & {
  sum_count?: number;
};

export type PostIsFollowingResultType = PostSumVotesResultType & {
  is_following?: boolean;
};

export type DateUpvoteCursor = {
  created_date: string;
  upvote_count: number;
};

export type IDLimitCursorSearch = {
  user_id: number;
  limit: number;
  search: string;
  cursor: string | null;
  filter?: string;
};

export type IDLimitCursorSearchToken = IDLimitCursorSearch & {
  token: string | null;
};

export type CursorPostDefault = {
  result: PostDefaultResultType[];
  cursor: string | null;
};

export type CursorPostDefaultSumVote = {
  result: PostSumVotesResultType[];
  cursor: string | null;
};

export type CursorPostDefaultIsFollowing = {
  result: PostIsFollowingResultType[];
  cursor: string | null;
};

export type PostIDUserID = {
  user_id: number;
  post_id: number;
};
export type PostIDUserIDToken = PostIDUserID & {
  token: string | null;
};

export type PostURLUserID = {
  user_id: number;
  post_url: string | undefined;
};
