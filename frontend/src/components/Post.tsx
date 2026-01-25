import { PostComponent, PostDefaultResultType } from "../types/PostType";
import "../css/post.css";
import React, { use, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/Auth";
import {
  addPostVote,
  deletePostVote,
  updatePostVote,
} from "../api/postVotesAPI";
import { addPostBookmark, deletePostBookmark } from "../api/postBookmarksAPI";
import { useNavigate } from "react-router-dom";
import { Menu, MenuItem, Select, TextField, Tooltip } from "@mui/material";
import { updatePost } from "../api/postsApi";
import { toast } from "react-toastify";
import Loading from "./Loading";

export default function Post({
  post_id,
  post_url,
  user_id,
  username,
  display_name,
  user_image,
  topic_id,
  topic_user_id,
  topic_name,
  category_icon,
  tag_name,
  tag_icon,
  tag_description,
  title,
  content,
  created_date,
  vote_id,
  upvote_count,
  downvote_count,
  vote_status,
  comment_count,
  bookmark_id,
  is_bookmarked,
  onNotLogin,
  tagsArr,
    removePost,
}: PostComponent) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const interactionRefs = useRef([]);
  const [voteLoading, setVoteLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showContent, setShowContent] = useState(tag_name ? false : true);
  const contentWarningDiv = useRef<HTMLDivElement | null>(null);
  const contentWarningBtn = useRef<HTMLButtonElement | null>(null);
  const [bookmarkID, setBookmarkID] = useState(bookmark_id);
  const [isBookmark, setIsBookmark] = useState(is_bookmarked);
  const [voteID, setVoteID] = useState<number | null>(vote_id);
  const [voteStatus, setVoteStatus] = useState(vote_status);
  const [upvoteCount, setUpvoteCount] = useState(upvote_count);
  const [downvoteCount, setDownvoteCount] = useState(downvote_count);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const [tagName, setTagName] = useState(tag_name ?? "none");
  const [postTitle, setPostTitle] = useState(title);
  const [postContent, setPostContent] = useState(content);
  const [showEditPost, setShowEditPost] = useState(false);
  const [editContentInput, setEditContentInput] = useState(content);
  const [editContentInputError, setEditContentInputError] = useState("");
  const [editTitleInput, setEditTitleInput] = useState(title);
  const [editTitleInputError, setEditTitleInputError] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const moreMenuOpen = Boolean(menuAnchorEl);

  function handleMoreMenuClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  }
  function handleMoreMenuClose() {
    setMenuAnchorEl(null);
  }

  //when click, showContent = false and add transition for the fade.
  function controlShowContent(e: React.SyntheticEvent) {
    e.stopPropagation();
    if (contentWarningDiv?.current && contentWarningBtn?.current) {
      contentWarningDiv.current.classList.add("fade-out");
      contentWarningBtn.current.classList.add("fade-out");
    }

    setTimeout(() => {
      setShowContent(true);
    }, 500);
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
        post_id: post_id,
        vote_type: votenum,
        token: token,
      };
      const newCount = await addPostVote(payload);
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (votenum == -1) {
        setDownvoteCount(newCount.downvote_count);
      } else {
        setUpvoteCount(newCount.upvote_count);
      }
      setVoteID(newCount.post_vote_id ?? null);
      setVoteStatus(votenum);
    } catch (error) {
      
    } finally {
      setVoteLoading(false);
    }
  }

  async function changeVote(voteNum: -1 | 1) {
    try {
      setVoteLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        post_vote_id: voteID,
        vote_type: voteNum,
        token: token,
      };
      const newCount = await updatePostVote(payload);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDownvoteCount(newCount.downvote_count);
      setUpvoteCount(newCount.upvote_count);
      setVoteStatus(voteNum);
    } catch (error) {
     
    } finally {
      setVoteLoading(false);
    }
  }

  async function removeVote() {
    try {
      setVoteLoading(true);
      const newCount = await deletePostVote(voteID);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setDownvoteCount(newCount.downvote_count);
      setUpvoteCount(newCount.upvote_count);
      setVoteID(null);
      setVoteStatus(null);
    } catch (error) {
      
    } finally {
      setVoteLoading(false);
    }
  }

  async function clickBookmarkBtn(e: React.SyntheticEvent) {
    e.stopPropagation();
    if (!user) {
      onNotLogin();
      return;
    } else if (!bookmarkID) {
      try {
        setBookmarkLoading(true);
        const token = localStorage.getItem("token");
        const payload = {
          user_id: user.user_id,
          post_id: post_id,
          token: token,
        };
        const newBookmarkID = await addPostBookmark(payload);
        setBookmarkID(newBookmarkID);
        setIsBookmark(true);
      } catch (error) {
       
      } finally {
        setTimeout(() => {
          setBookmarkLoading(false);
        }, 1000);
      }
    } else {
      await deletePostBookmark(bookmarkID);
      setBookmarkID(null);
      setIsBookmark(false);
    }
  }

  function navigateToPost() {
    //too prevent users from navigating when selecting text
    const selection = window.getSelection();
    if ((selection && selection.toString().length > 0) || showEditPost) {
      return;
    }

    navigate(`/buzz/${post_url}`);
  }

  async function editPost() {
    try {
      setUpdateLoading(true);
      if (editTitleInput.length == 0) {
        toast.error("title cannot be empty", {
          autoClose: 3000,
        });
      }
      if (editContentInput.length == 0) {
        toast.error("content cannot be empty", {
          autoClose: 3000,
        });

        return;
      }
      const token = localStorage.getItem("token");
      const tagID =
        tagsArr.find((ele) => ele.tag_name == tagName)?.tag_id ?? null;
      const payload = {
        title: editTitleInput,
        tag_id: tagID,
        post_id: post_id,
        token: token,
        content: editContentInput,
      };
      const result = await updatePost(payload);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setTagName(
        tagsArr.find((ele) => ele.tag_id == result?.tag_id)?.tag_name ?? "none",
      );
      setShowContent(result?.tag_id == null);
      setPostTitle(result.title);
      setPostContent(result.content);
      setShowEditPost(false);
      setMenuAnchorEl(null);
      toast.success(`Post is updated!`, {
        autoClose: 2000,
      });
    } catch (e) {
        toast.error("Post is not updated! error!", { autoClose: 2000 });
    } finally {
      setTimeout(() => {
        setUpdateLoading(false);
      }, 2000);
    }
  }

  return (
    <div
      className="post-item-main-div fade-in"
      key={post_id}
      id={`post-item-${post_url}`}
      onClick={() => {
        navigateToPost();
      }}
    >
      <Loading isLoading={updateLoading} />
      {showEditPost ? (
        <div
          className="d-flex justify-content-between flex-column"
          style={{ gap: "20px" }}
        >
          <div>
            <p className="post-postpage-comment-edit-content-label ">
              Edit Tags
            </p>
            <Select
              value={tagName}
              id="main-page-filter-select"
              sx={{
                padding: 0,
                "& .MuiSelect-select": {
                  padding: 0,
                  fontSize: 14,
                  "text-shadow": "0.2px 0 currentColor",
                  backgroundColor: "#ffdb78",
                  color: "#6d3c21",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "1.7px solid #6d3c21",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  border: "1.7px solid var(--wood-brown)",
                },
                "& .MuiSelect-icon": {
                  color: "#6d3c21",
                },
              }}
              MenuProps={{
                MenuListProps: {
                  sx: {
                    padding: 0,
                    "& .MuiMenuItem-root": {
                      color: "var(--wood-brown)",
                      backgroundColor: "var(--milk-white)",
                      fontSize: 14,
                      fontFamily: "Segoe UI",
                      textAlign: "center",
                      padding: 0,
                      "text-shadow": "0.2px 0 currentColor",
                    },

                    "& .MuiMenuItem-root:hover": {
                      backgroundColor: "var(--cream-yellow)",
                      color: "#d69d00",
                      padding: 0,
                    },

                    "& .MuiMenuItem-root.Mui-selected": {
                      // backgroundColor: "#fddf85 !important",
                      backgroundColor: "var(--canary-yellow)",
                      color: "#6d3c21",
                      "text-shadow": "0.3px 0 currentColor",
                      padding: 0,
                    },
                  },
                },
              }}
              onChange={(e) => {
                setTagName(e.target.value);
              }}
            >
              <MenuItem value={"none"}>
                <div
                  style={{
                    padding: "13px 10px",
                    width: "100%",
                    textAlign: "start",
                  }}
                >
                  None
                </div>
              </MenuItem>
              {tagsArr.map((tagEle) => (
                <MenuItem value={tagEle.tag_name}>
                  <Tooltip
                    title={tagEle.tag_description}
                    placement="right"
                    slotProps={{
                      tooltip: {
                        sx: {
                          color: "var(--milk-white)",
                          backgroundColor: "var(--caramel-brown)",
                          fontFamily: "Segoe UI",
                          fontSize: "12px",
                          marginLeft: "15px",
                        },
                      },
                    }}
                  >
                    <div
                      style={{
                        padding: "13px 10px",
                        width: "100%",
                        textAlign: "start",
                      }}
                    >
                      <p className="post-item-tag-menu-item-label">
                        <i
                          className={`${tagEle.tag_icon} post-item-tag-menu-item-icon`}
                        />
                        {tagEle.tag_name}
                      </p>
                    </div>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </div>
          <div>
            <p className="post-postpage-comment-edit-content-label ">
              Edit Title
            </p>
            <TextField
              fullWidth
              multiline
              value={editTitleInput}
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim().length > 150) {
                  setEditTitleInputError("must be less than 150 characters");
                } else {
                  setEditTitleInput(value);
                  setEditTitleInputError("");
                }
              }}
              onBlur={() => {
                if (editTitleInput.trim().length == 0) {
                  setEditTitleInputError("title cannot be empty");
                } else {
                  setEditTitleInputError("");
                }
              }}
              sx={{
                padding: 0,
                "& .MuiInputBase-input": {
                  padding: "15px 10px",
                  color: " var(--wood-brown)",
                  fontFamily: "zabal",
                  fontSize: 30,
                  lineHeight: 1.2,
                  textShadow: "0.2px 0 currentColor",
                  backgroundColor: "#fff9ec4b",
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "15px",
                  padding: 0,
                  fontSize: "15px",
                  fontFamily: "Segoe UI",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      editTitleInputError.trim().length > 0
                        ? "var(--oak-red)"
                        : "#674e3937",
                    borderWidth:
                      editTitleInputError.trim().length > 0 ? "2px" : "1.5px",
                  },
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        editTitleInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "#693b22d4",
                    },
                  },
                  "&:hover:not(.Mui-focused)": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        editTitleInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "#43261681",
                    },
                  },
                },
              }}
            />
            <div
              className={`mt-1 d-flex justify-content-${editTitleInputError.trim().length > 0 ? "between" : "end"} align-items-center`}
            >
              {editTitleInputError.trim().length > 0 && (
                <p className="post-page-comment-textfield-error">
                  {editTitleInputError}
                </p>
              )}
              <p className="post-page-comment-textfield-end-adornment">
                <span
                  style={{
                    color:
                      editTitleInputError.length > 0
                        ? "var(--oak-red)"
                        : " rgba(128, 128, 128, 0.5)",
                  }}
                >
                  {editTitleInput.trim().length}
                </span>
                /150
              </p>
            </div>
          </div>
          <div>
            <p className="post-postpage-comment-edit-content-label ">
              Edit Content
            </p>
            <TextField
              fullWidth
              value={editContentInput}
              multiline
              className="post-item-edit-content-textfield"
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim().length > 3000) {
                  setEditContentInputError("must be less than 3000 characters");
                } else {
                  setEditContentInput(value);
                }
              }}
              onBlur={() => {
                if (editContentInput.trim().length == 0) {
                  setEditContentInputError("content cannot be empty");
                } else {
                  setEditContentInputError("");
                }
              }}
              sx={{
                padding: 0,
                "& .MuiInputBase-input": {
                  padding: "15px 10px",
                  color: "#693b22",
                  textShadow: "0.2px 0 currentColor",
                  backgroundColor: "#fff9ec4b",
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "15px",
                  padding: 0,
                  fontSize: "15px",
                  fontFamily: "Segoe UI",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      editContentInputError.trim().length > 0
                        ? "var(--oak-red)"
                        : "#674e3937",
                    borderWidth:
                      editContentInputError.trim().length > 0 ? "2px" : "1.5px",
                  },
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        editContentInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "var(--honey-yellow)",
                    },
                  },
                  "&:hover:not(.Mui-focused)": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        editContentInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "#efb33370",
                    },
                  },
                },
              }}
            />
            <div
              className={`mt-1 d-flex justify-content-${editContentInputError.trim().length > 0 ? "between" : "end"} align-items-center`}
            >
              {editContentInputError.trim().length > 0 && (
                <p className="post-page-comment-textfield-error">
                  {editContentInputError}
                </p>
              )}
              <p className="post-page-comment-textfield-end-adornment">
                <span
                  style={{
                    color:
                      editContentInputError.length > 0
                        ? "var(--oak-red)"
                        : " rgba(128, 128, 128, 0.5)",
                  }}
                >
                  {editContentInput.trim().length}
                </span>
                /3000
              </p>
            </div>
          </div>
          <div className="d-flex justify-content-end post-postpage-comment-edit-btn-div">
            <button
              type="button"
              //disabled
              className="btn comment-component-reply-btn  hazelnutbrown-hazelnutbrown-milkwhite honeyyellow-branchbrown-branchbrown-hover"
              onClick={() => {
                setShowEditPost(false);
                setMenuAnchorEl(null);
              }}
            >
              cancel
            </button>
            <button
              type="button"
              //disabled
              className="btn comment-component-reply-btn milkwhite-hazelnutbrown-hazelnutbrown honeyyellow-hazelnutbrown-hazelnutbrown-hover"
              onClick={() => {
                editPost();
              }}
            >
              submit
            </button>
          </div>
        </div>
      ) : (
        <div
          className="d-flex justify-content-between flex-column"
          style={{ gap: "20px" }}
        >
          <div>
            <div
              className="post-item-top-header"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className=" d-flex justify-content-between align-items-center">
                <div>
                  <div className="post-item-topic-div d-flex align-items-center">
                    <i className={`${category_icon} post-item-topic-icon`} />
                    <div>
                      <p className="m-0">{topic_name}</p>
                    </div>
                  </div>
                </div>
                <div className="post-postpage-comment-top-header-end">
                  <p className="post-item-created-date m-0">{created_date}</p>
                  {(user?.user_id == user_id ||
                    topic_user_id == user?.user_id) && (
                    <div>
                      <button
                        className="empty-button post-postpage-comment-top-header-end btn"
                        type="button"
                        aria-controls={
                          moreMenuOpen ? "post-page-more-menu" : undefined
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
                        id="post-page-more-menu"
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
                                padding: "5px 10px",
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
                        {user?.user_id == user_id && (
                          <MenuItem
                            style={{
                              borderBottom: "1.5px solid var(--honey-yellow)",
                            }}
                            onClick={() => {
                              setShowEditPost(true);
                            }}
                          >
                            <p className="post-postpage-comment-more-menu-label">
                              edit buzz <i className="fa-solid fa-pencil" />
                            </p>
                          </MenuItem>
                        )}
                        <MenuItem onClick={() => {
                            removePost(post_id);
                        }}>
                          <p className="post-postpage-comment-more-menu-label">
                            delete buzz{" "}
                            <i className="fa-solid fa-trash-can"></i>
                          </p>
                        </MenuItem>
                      </Menu>
                    </div>
                  )}
                </div>
              </div>
              <div className="post-item-username-div d-flex align-items-center">
                <div className="post-item-username-img">
                  <img src={require(`../images/${user_image}`)} />
                </div>
                {user?.user_id == user_id ? (
                  <p
                    className="m-0"
                    style={{
                      color: "rgb(255, 191, 54)",
                      filter: "drop-shadow(0px 0px 0px rgba(31, 18, 6, 0))",
                    }}
                  >
                    Me
                  </p>
                ) : (
                  <div>
                    <p className="m-0 post-item-display-name">{display_name}</p>
                    {display_name !== username && (
                      <p className="m-0 post-item-username">@{username}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="post-item-title-content-div">
              <h2 className="post-item-title">{postTitle}</h2>

              <div className="post-item-content-wrapper">
                {!showContent && (
                  <div
                    className="post-item-content-warning-overlay"
                    ref={contentWarningDiv}
                  >
                    <button
                      type="button"
                      className="post-item-content-warning-btn"
                      ref={contentWarningBtn}
                      onClick={(e) => controlShowContent(e)}
                    >
                      <span className="post-item-content-warning">
                        <i
                          className={`${tagsArr.find((ele) => ele.tag_name == tagName)?.tag_icon}`}
                        />{" "}
                        {tagName}
                      </span>
                      <span className="d-block post-item-content-warning-description">
                        {tag_description}
                      </span>
                    </button>
                  </div>
                )}

                <div className={`post-item-content-div`}>
                  <div className="post-item-edit-content-div">
                    <p className="post-item-content">{postContent}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="post-item-bottom-footer d-flex align-items-center">
              <div
                className="d-flex post-item-rate-div post-item-bottom-footer-div"
                onClick={(e) => {
                  e.stopPropagation();
                }}
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
                      className={`fa${voteStatus == 1 ? "-solid" : "-regular"} fa-thumbs-up post-item-rate-icon post-item-bottom-footer-icon ${voteLoading ? "disabled" : ""}`}
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
                      className={`fa${voteStatus == -1 ? "-solid" : "-regular"} fa-thumbs-down post-item-rate-icon post-item-bottom-footer-icon ${voteLoading ? "disabled" : ""}`}
                    />
                  </button>
                </div>
              </div>
              <div className="post-item-bottom-footer-div post-item-comment-div d-flex align-items-center">
                <button type="button" className="empty-button">
                  <i
                    className="fa-regular fa-comment post-item-comment-icon post-item-bottom-footer-icon"
                    onClick={() => {
                      navigateToPost();
                    }}
                  />
                </button>
                <p className="m-0 post-item-comment-label">
                  {comment_count}
                </p>{" "}
              </div>
              <div
                className="post-item-bottom-footer-div"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <button
                  type="button"
                  className="empty-button"
                  disabled={bookmarkLoading}
                >
                  <i
                    className={`fa${isBookmark ? "-solid" : "-regular"} fa-bookmark post-item-bottom-footer-icon post-item-bookmark-icon  ${bookmarkLoading ? "disabled" : ""}`}
                    onClick={(e) => {
                      clickBookmarkBtn(e);
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
