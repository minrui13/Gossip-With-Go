import React, { useEffect, useState } from "react";
import {
  CommentDefaultResult,
  CommentListProp,
  CommentProp,
  CommentReplyChildArray,
} from "../types/CommentType";
import "../css/comment.css";
import { useAuth } from "../auth/Auth";
import {
  addCommentVote,
  deleteCommentVote,
  updateCommentVote,
} from "../api/commentVotesAPI";
import {
  addNewComment,
  deleteComment,
  getReplyByCommentId,
  updateComment,
} from "../api/commentApi";
import {
  calculateDate,
  getCommentInputPlaceholder,
} from "../utils/UtilsFunction";
import Loading from "./Loading";
import { InputAdornment, Menu, MenuItem, TextField } from "@mui/material";
import { toast } from "react-toastify";

export function Comment({
  commentData,
  depth = 0,
  style = {},
  commentDataIndex = -1,
  onNotLogin,
  isPostEdit,
}: CommentProp) {
  const { user } = useAuth();
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteID, setVoteID] = useState<number | null>(commentData.vote_id);
  const [voteStatus, setVoteStatus] = useState<number | null>(
    commentData.vote_status,
  );
  const [upvoteCount, setUpvoteCount] = useState(commentData.upvote_count);
  const [downvoteCount, setDownvoteCount] = useState(
    commentData.downvote_count,
  );
  const [commentInfo, setCommentInfo] =
    useState<CommentReplyChildArray>(commentData);
  const [isMoreReplies, setIsMoreReplies] = useState(
    commentData?.replyChildren?.length < commentData?.reply_count,
  );
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [isReplyLoading, setIsReplyLoading] = useState(false);
  const [openAddReply, setOpenAddReply] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [commentContent, setCommentContent] = useState(commentData.content);
  const [showCommentEdit, setShowCommentEdit] = useState(false);
  const [editCommentInput, setEditCommentInput] = useState(commentData.content);
  const [editCommentInputError, setEditCommentInputError] = useState("");
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const moreMenuOpen = Boolean(menuAnchorEl);
  function handleMoreMenuClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  }
  function handleMoreMenuClose() {
    setMenuAnchorEl(null);
  }

  function clickVoteBtn(newVote: 1 | -1, e: React.SyntheticEvent) {
    e.stopPropagation();
    //check if user is a login member
    if (!user) {
      onNotLogin();
      return;
    }
    //if vote_id doesnt exist = haven't vote for this post yets
    if (!voteID) {
      addVote(newVote);
    }
    // if vote_type is different = change vote
    else if (newVote != voteStatus) {
      changeVote(newVote);
    } else {
      removeVote();
    }
  }
  async function addVote(votenum: -1 | 1) {
    try {
      const token = localStorage.getItem("token");
      setVoteLoading(true);
      const payload = {
        user_id: user.user_id,
        comment_id: commentData.comment_id,
        vote_type: votenum,
        token: token,
      };
      const newCount = await addCommentVote(payload);
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (votenum == -1) {
        setDownvoteCount(newCount.downvote_count);
      } else {
        setUpvoteCount(newCount.upvote_count);
      }
      setVoteID(newCount.comment_vote_id ?? null);
      setVoteStatus(votenum);
    } catch (error) {
      console.error(error);
    } finally {
      setVoteLoading(false);
    }
  }
  async function changeVote(voteNum: -1 | 1) {
    try {
      setVoteLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        comment_vote_id: voteID,
        vote_type: voteNum,
        token: token,
      };
      const newCount = await updateCommentVote(payload);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDownvoteCount(newCount.downvote_count);
      setUpvoteCount(newCount.upvote_count);
      setVoteStatus(voteNum);
    } catch (error) {
      console.error(error);
    } finally {
      setVoteLoading(false);
    }
  }
  async function removeVote() {
    try {
      setVoteLoading(true);
      const newCount = await deleteCommentVote(voteID);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDownvoteCount(newCount.downvote_count);
      setUpvoteCount(newCount.upvote_count);
      setVoteID(null);
      setVoteStatus(null);
    } catch (error) {
      console.error(error);
    } finally {
      setVoteLoading(false);
    }
  }
  async function showMoreReplies() {
    try {
      setIsReplyLoading(true);
      const payload = {
        parent_comment_id: commentData.comment_id,
        user_id: user.user_id,
      };
      const result = await getReplyByCommentId(payload);
      const mainRepliesArr: CommentReplyChildArray[] = buildTree(
        result.map((ele) => ({
          ...ele,
          created_date: calculateDate(ele.created_date),
          replyChildren: [],
        })),
        commentData.comment_id,
      );
      setCommentInfo((prev) => ({
        ...prev,
        replyChildren: mainRepliesArr,
      }));
      setIsMoreReplies(result.length < commentData.reply_count);
    } catch (e) {

    } finally {
      setIsReplyLoading(false);
    }
  }

  async function createComment() {
    try {
      setIsReplyLoading(true);
      if (replyInput.trim().length == 0) {
        toast.error("comment cannot be empty", {
          autoClose: 2000,
        });
        setIsReplyLoading(false);
        return;
      }
      setOpenAddReply(false);
      const token = localStorage.getItem("token");
      const payload = {
        post_id: commentData.post_id,
        token: token,
        content: replyInput,
        parent_comment_id: commentData.comment_id,
        user_id: user?.user_id ?? 0,
      };
      const result = await addNewComment(payload);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("comment is successfully added!", {
        autoClose: 2000,
      });
      const resultJSON = {
        ...result,
        created_date: calculateDate(result.created_date),
        replyChildren: [],
      };
      setCommentInfo((prev) => ({
        ...prev,
        replyChildren: [...prev.replyChildren, resultJSON],
      }));
    } catch (e) {
        toast.error("comment is not added! error!", { autoClose: 2000 });
    } finally {
      setIsReplyLoading(false);
    }
  }

  async function editComment() {
    try {
      setIsUpdateLoading(true);
      if (editCommentInput.trim().length == 0) {
        toast.error("comment cannot be empty", {
          autoClose: 3000,
        });
        setIsUpdateLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      const payload = {
        token: token,
        content: editCommentInput,
        comment_id: commentData.comment_id,
      };
      const result = await updateComment(payload);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCommentContent(result.content);
      setShowCommentEdit(false);
      toast.success("comment updated!", {
        autoClose: 3000,
      });
    } catch (e) {
        toast.error("comment is not updated! error!", { autoClose: 2000 });
    } finally {
      setMenuAnchorEl(null);
      setIsUpdateLoading(false);
    }
  }

  async function removeComment() {
    try {
      setIsUpdateLoading(true);
      await deleteComment(commentData.comment_id);
      setMenuAnchorEl(null);
      toast.success("comment is successfully deleted!", {
        autoClose: 2000,
      });
    } catch (e) {
      toast.error("comment is not deleted! error!", { autoClose: 2000 });
    } finally {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      setTimeout(() => {
        setIsUpdateLoading(false);
      }, 2000);
    }
  }

  useEffect(() => {
    setIsMoreReplies(
      commentInfo?.replyChildren?.length < commentInfo?.reply_count,
    );
  }, [commentInfo]);

  return (
    <div
      key={commentInfo.comment_id}
      className={`fade-in comment-component-main-div ${depth ? "reply" : ""}`}
      style={{
        ...style,
        marginLeft: depth * 40,
        marginTop: depth ? 20 : commentDataIndex == 0 ? 0 : 23,
      }}
    >
      <Loading isLoading={isUpdateLoading} />
      <div>
        <div
          className={`comment-component-content-div ${depth > 1 ? "reply" : ""}`}
          style={{
            backgroundColor: depth ? "#caddec96" : "#b2d1eab7",
            marginLeft: depth ? 15 : 0,
          }}
        >
          {showCommentEdit ? (
            <div
              className="d-flex justify-content-between flex-column"
              style={{ gap: "20px" }}
            >
              <div>
                <p
                  className="comment-component-edit-content-label "
                  style={{
                    color: depth ? "rgb(124, 168, 204)" : "rgb(89, 157, 213)",
                  }}
                >
                  Edit Comment
                </p>
                <TextField
                  fullWidth
                  value={editCommentInput}
                  multiline
                  className="post-item-edit-content-textfield"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.trim().length > 3000) {
                      setEditCommentInputError(
                        "must be less than 3000 characters",
                      );
                    } else {
                      setEditCommentInput(value);
                      setEditCommentInputError("");
                    }
                  }}
                  onBlur={() => {
                    if (editCommentInput.trim().length == 0) {
                      setEditCommentInputError("content cannot be empty");
                    } else {
                      setEditCommentInputError("");
                    }
                  }}
                  sx={{
                    padding: 0,
                    "& .MuiInputBase-input": {
                      padding: "15px 10px",
                      color: "var(--wood-brown)",
                      textShadow: "0.2px 0 currentColor",
                      backgroundColor: "#fff9ec4b",
                      borderRadius: "15px",
                    },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "15px",
                      padding: 0,
                      fontSize: "15px",
                      fontFamily: "Segoe UI",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor:
                          editCommentInputError.trim().length > 0
                            ? "var(--oak-red)"
                            : "#92929221",
                        borderWidth:
                          editCommentInputError.trim().length > 0
                            ? "2px"
                            : "1.5px",
                      },
                      "&.Mui-focused": {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            editCommentInputError.trim().length > 0
                              ? "var(--oak-red)"
                              : depth
                                ? "rgba(96, 156, 206, 0.58)"
                                : "rgba(58, 139, 205, 0.58)",
                        },
                      },
                      "&:hover:not(.Mui-focused)": {
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor:
                            editCommentInputError.trim().length > 0
                              ? "var(--oak-red)"
                              : "rgba(63, 153, 227, 0.2)",
                        },
                      },
                    },
                  }}
                />
                <div
                  className={`mt-1 d-flex justify-content-${editCommentInputError.trim().length > 0 ? "between" : "end"} align-items-center`}
                >
                  {editCommentInputError.trim().length > 0 && (
                    <p className="post-page-comment-textfield-error">
                      {editCommentInputError}
                    </p>
                  )}
                  <p className="post-page-comment-textfield-end-adornment">
                    <span
                      style={{
                        color:
                          editCommentInputError.length > 0
                            ? "var(--oak-red)"
                            : " rgba(128, 128, 128, 0.5)",
                      }}
                    >
                      {editCommentInput.trim().length}
                    </span>
                    /3000
                  </p>
                </div>
              </div>
              <div className="d-flex justify-content-end post-postpage-comment-edit-btn-div">
                <button
                  type="button"
                  disabled={isUpdateLoading}
                  className="btn comment-component-reply-btn  comment-component-edit-cancel-btn  creamyellow-branchbrown-branchbrown-hover"
                  onClick={() => {
                    setShowCommentEdit(false);
                    setMenuAnchorEl(null);
                  }}
                >
                  cancel
                </button>
                <button
                  type="button"
                  //disabled
                  className="btn comment-component-reply-btn comment-component-edit-submit-btn branchbrown-branchbrown-creamyellow-hover"
                  onClick={() => {
                    editComment();
                  }}
                >
                  submit
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className=" d-flex justify-content-between align-items-center">
                <div className="comment-component-username-div">
                  <div className="comment-component-username-img">
                    <img src={require(`../images/${commentInfo.image_name}`)} />
                  </div>
                  {user?.user_id == commentInfo.user_id ? (
                    <p
                      className="m-0"
                      style={{
                        color: "rgb(232, 169, 34)",
                        filter: "drop-shadow(0px 0px 0px rgba(31, 18, 6, 0))",
                      }}
                    >
                      Me
                    </p>
                  ) : (
                    <div>
                      <p className="m-0 comment-component-display-name">
                        {commentInfo.display_name}
                      </p>
                      {commentInfo.display_name !== commentInfo.username && (
                        <p className="m-0 comment-component-username">
                          @{commentInfo.username}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="post-postpage-comment-top-header-end">
                  <p
                    className="comment-component-created-date m-0"
                    style={{ color: depth ? "#c48900a3" : "#c48900d4" }}
                  >
                    {commentInfo.created_date}
                  </p>
                  {(user?.user_id == commentData.user_id ||
                    user?.user_id === commentData.post_user_id) && (
                    <div
                      style={{
                        position: "relative",
                        display: "inline-block",
                      }}
                    >
                      <button
                        className="empty-button post-postpage-comment-top-header-end btn"
                        type="button"
                        aria-controls={
                          moreMenuOpen ? "comment-more-menu" : undefined
                        }
                        aria-haspopup="true"
                        aria-expanded={moreMenuOpen ? "true" : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoreMenuClick(e);
                        }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          handleMoreMenuClick(e);
                        }}
                      >
                        ...
                      </button>
                      <Menu
                        id="comment-more-menu"
                        anchorEl={menuAnchorEl}
                        open={moreMenuOpen}
                        onClose={handleMoreMenuClose}
                        slotProps={{
                          paper: {
                            sx: {
                              boxShadow: "0px 0px 10px rgba(83, 47, 18, 0.15)",
                              borderRadius: "5px",
                            },
                          },
                          list: {
                            onMouseLeave: () => setMenuAnchorEl(null),
                            sx: {
                              padding: 0,
                              "& .MuiMenuItem-root": {
                                padding: "10px 10px",
                                color: "var(--wood-brown)",
                                backgroundColor: "#fff2d7a8 !important",
                                fontSize: 14,
                                fontFamily: "Segoe UI",
                                "text-shadow": "0.2px 0 currentColor",
                              },

                              "& .MuiMenuItem-root:hover": {
                                backgroundColor: "#ffdb78ad !important",
                                color: "#e8b321",
                              },
                            },
                          },
                        }}
                      >
                        {user?.user_id == commentData.user_id && (
                          <MenuItem
                            style={{
                              borderBottom: "1.5px solid var(--honey-yellow)",
                            }}
                            onClick={() => {
                              setShowCommentEdit(true);
                            }}
                          >
                            <p className="post-postpage-comment-more-menu-label">
                              edit comment <i className="fa-solid fa-pencil" />
                            </p>
                          </MenuItem>
                        )}
                        <MenuItem
                          onClick={() => {
                            removeComment();
                            setMenuAnchorEl(null);
                          }}
                        >
                          <p className="post-postpage-comment-more-menu-label">
                            delete comment{" "}
                            <i className="fa-solid fa-trash-can"></i>
                          </p>
                        </MenuItem>
                      </Menu>
                    </div>
                  )}
                </div>
              </div>
              <p className="comment-component-content">{commentContent}</p>
              <div className="comment-component-bottom-footer d-flex align-items-center">
                <div
                  className="d-flex comment-component-rate-div comment-component-bottom-footer-div"
                  style={{ backgroundColor: depth ? "#fff9ec7e" : "#fff9ecbc" }}
                >
                  <div
                    className="d-flex align-items-center rate-div"
                    onClick={(e) => {
                      clickVoteBtn(1, e);
                    }}
                  >
                    <p className="m-0">{upvoteCount}</p>
                    <button
                      type="button"
                      className="empty-button"
                      disabled={voteLoading}
                    >
                      <i
                        className={`fa-${voteStatus == 1 ? `solid` : `regular`} fa-thumbs-up comment-component-rate-icon comment-component-bottom-footer-icon ${voteLoading ? "disabled" : ""}`}
                      />
                    </button>
                  </div>
                  <div
                    className="d-flex align-items-center rate-div"
                    onClick={(e) => {
                      clickVoteBtn(-1, e);
                    }}
                  >
                    <p className="m-0">{downvoteCount}</p>
                    <button
                      type="button"
                      className="empty-button"
                      disabled={voteLoading}
                    >
                      <i
                        className={`fa-${voteStatus == -1 ? `solid` : `regular`} fa-thumbs-down comment-component-rate-icon comment-component-bottom-footer-icon ${voteLoading ? "disabled" : ""}`}
                      />
                    </button>
                  </div>
                </div>
                <div
                  className="comment-component-bottom-footer-div comment-component-comment-div d-flex align-items-center"
                  style={{ backgroundColor: depth ? "#fff9ec7e" : "#fff9ecbc" }}
                  onClick={() => {
                    if (user?.user_id) {
                      setOpenAddReply(true);
                    } else {
                      onNotLogin();
                    }
                  }}
                >
                  <button type="button" className="empty-button">
                    <i className="fa-regular fa-comment comment-component-comment-icon comment-component-bottom-footer-icon" />
                  </button>
                  <p className="m-0 comment-component-comment-label">Reply</p>
                </div>
              </div>
            </div>
          )}
        </div>
        {openAddReply && (
          <div className="comment-component-reply-textfield-div">
            <TextField
              size="small"
              multiline
              fullWidth
              disabled={isPostEdit}
              value={replyInput}
              placeholder={getCommentInputPlaceholder()}
              className="comment-component-reply-textfield"
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim().length > 3000) {
                  setInputError("must be less than 3000 characters");
                } else {
                  setReplyInput(value);
                  setInputError("");
                }
              }}
              onBlur={() => {
                setInputError("");
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "15px",
                  padding: "10px 12px",
                  fontSize: "14.5px",
                  fontFamily: "Segoe UI",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      inputError.trim().length > 0
                        ? "var(--oak-red)"
                        : "#c9c9c986",
                    borderWidth: inputError.trim().length > 0 ? "2px" : "1.5px",
                  },
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        inputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "var(--honey-yellow)",
                    },
                  },
                  "&:hover:not(.Mui-focused)": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        inputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "rgba(143, 173, 196, 0.59)",
                    },
                  },
                },

                "& .MuiInputBase-input": {
                  fontSize: "0.95rem",
                  lineHeight: "1.4",
                },
              }}
              minRows={1}
            />
            <div
              className={`mt-1 d-flex justify-content-${inputError.trim().length > 0 ? "between" : "end"} align-items-center`}
            >
              {inputError.trim().length > 0 && (
                <p className="comment-component-reply-textfield-error">
                  {inputError}
                </p>
              )}
              <p className="comment-component-reply-textfield-end-adornment">
                <span
                  style={{
                    color:
                      inputError.length > 0
                        ? "var(--oak-red)"
                        : " rgba(128, 128, 128, 0.5)",
                  }}
                >
                  {replyInput.trim().length}
                </span>
                /3000
              </p>
            </div>
            <div className="d-flex justify-content-end align-items-center comment-component-reply-btn-div">
              <button
                type="button"
                disabled={isReplyLoading || isPostEdit}
                className="btn comment-component-reply-btn branchbrown-branchbrown-creamyellow honeyyellow-branchbrown-branchbrown-hover"
                onClick={() => {
                  setOpenAddReply(false);
                }}
              >
                cancel
              </button>
              <button
                type="button"
                disabled={
                  isReplyLoading || isPostEdit || replyInput.trim().length == 0
                }
                className="btn comment-component-reply-btn creamyellow-branchbrown-branchbrown honeyyellow-branchbrown-branchbrown-hover"
                onClick={() => {
                  createComment();
                }}
              >
                submit
              </button>
            </div>
          </div>
        )}
      </div>

      {isReplyLoading ? (
        <Loading
          variant="success"
          isLoading={isReplyLoading}
          style={{
            position: "static",
            transform: "translate(40px, 10px)",
            filter: "drop-shadow(0px 0px 0px #82828256)",
            marginTop: 10,
          }}
        />
      ) : (
        <div className="comment-component-reply-div d-flex flex-column">
          {commentInfo?.replyChildren?.map((childEle) => (
            <Comment
              isPostEdit={isPostEdit}
              style={{ marginTop: 20 }}
              key={childEle.comment_id}
              commentData={childEle}
              depth={depth + 1}
              onNotLogin={onNotLogin}
            />
          ))}
          {isMoreReplies && (
            <div className="btn comment-component-view-more-div">
              <div className="comment-component-connector-vertical" />
              {/* <div  className="comment-component-connector-horizontal"/> */}
              <button
                className="btn comment-component-view-more-replies"
                type="button"
                onClick={() => showMoreReplies()}
              >
                View more replies
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CommentList({
  commentArr,
  onNotLogin,
  isPostEdit,
}: CommentListProp) {
  return (
    <div className="d-flex flex-column" style={{ gap: 30 }}>
      {commentArr.map((commentEle, commentEleIndex) => (
        <Comment
          isPostEdit={isPostEdit}
          key={commentEle.comment_id}
          commentData={commentEle}
          commentDataIndex={commentEleIndex}
          onNotLogin={onNotLogin}
        />
      ))}
    </div>
  );
}

//build the comments tree so to match child to parent
export function buildTree(
  commentArr: CommentReplyChildArray[],
  parentID: number | null = null,
): CommentReplyChildArray[] {
  return commentArr
    .filter((ele) => ele.parent_comment_id === parentID)
    .map((commentEle) => ({
      ...commentEle,
      replyChildren: buildTree(commentArr, commentEle.comment_id),
    }));
}
