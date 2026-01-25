export type VoteTypeUserPost = {
  vote_type: -1 | 1;
  user_id: number;
  post_id: number;
  token: string | null;
};

export type VoteTypePostVote = {
  vote_type: -1 | 1;
  post_vote_id: number | null;
  token: string | null;
};

export type VoteDetails = {
  post_vote_id: number | null;
  vote_type: -1 | 1;
  user_id: number;
  post_id: number;
};
export type VoteCountType = {
  upvote_count: number;
  downvote_count: number;
};

export type VoteCountTypeVoteID = VoteCountType& {
  post_vote_id? : number;
  comment_vote_id? : number;
};

export type VoteTypeUserComment = {
  vote_type: -1 | 1;
  user_id: number;
  comment_id: number;
  token: string | null;
};

export type VoteTypeCommentVote = {
  vote_type: -1 | 1;
  comment_vote_id: number | null;
  token: string | null;
};


export type VoteCommentDetails = {
  comment_vote_id: number | null;
  vote_type: -1 | 1;
  user_id: number;
  post_id: number;
};
