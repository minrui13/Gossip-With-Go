export type CommentDefaultResult = {
  comment_id: number;
  user_id: number;
  username: string;
  display_name: string;
  image_name: string;
  post_id: number;
  post_user_id: number;
  parent_comment_id: number | null;
  content: string;
  created_date: string;
  vote_id: number;
  upvote_count: number;
  downvote_count: number;
  sum_votes: number;
  vote_status: number;
  reply_count: number;
};

export type CommentPayload = {
  limit: number;
  cursor: string | null;
  sort_by?: string;
  post_id: number;
  user_id: number;
};

export type CommentReplyChildArray = CommentDefaultResult & {
  replyChildren: CommentReplyChildArray[];
};

export type CommentProp = {
  commentData: CommentReplyChildArray;
  depth?: number;
  style?: React.CSSProperties;
  commentDataIndex?: number;
  onNotLogin: () => void;
  isPostEdit: boolean;
};

export type CommentListProp = {
  commentArr: CommentReplyChildArray[];
  onNotLogin: () => void;
  isPostEdit: boolean;
};

export type CursorCommentDefault = {
  result: CommentDefaultResult[];
  cursor: string | null;
};

export type ParentUserId = {
  parent_comment_id: number | null;
  user_id: number;
};

export type CommentAddPayload = ParentUserId & {
  post_id: number;
  content: string;
  token: string | null;
};

export type CommentUpdatePayload = {
  comment_id: number;
  content: string;
  token: string | null;
};

export type CommentDeleteResult = {
  comment_id: number;
  parent_comment_id: number;
};
