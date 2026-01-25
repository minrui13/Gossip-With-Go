import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/Auth";
import { deletePost, getPostByURL, updatePost } from "../api/postsApi";
import { toast } from "react-toastify";
import { PostDefaultResultType } from "../types/PostType";
import { addNewComment, getCommentsByPostId } from "../api/commentApi";
import BuzzBeeScrollToTop from "../images/BeeScrollToTop.PNG";
import {
  CommentDefaultResult,
  CommentReplyChildArray,
} from "../types/CommentType";
import "../css/postpage.css";
import { buildTree, CommentList } from "../components/Comments";
import {
  calculateDate,
  getCommentInputPlaceholder,
} from "../utils/UtilsFunction";
import Loading from "../components/Loading";
import { Menu, MenuItem, Select, TextField, Tooltip } from "@mui/material";
import {
  addPostVote,
  deletePostVote,
  updatePostVote,
} from "../api/postVotesAPI";
import { addPostBookmark, deletePostBookmark } from "../api/postBookmarksAPI";
import NotLogin from "../components/NotLogin";
import { getAllTags } from "../api/tagApi";
import { TagDefaultType } from "../types/TagType";

export default function PostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { buzz_url } = useParams();
  const [commentPlaceholder, setCommentPlaceholder] = useState("");
  const [commentsArr, setCommentsArr] = useState<CommentReplyChildArray[]>([]);
  const [postInfo, setPostInfo] = useState<PostDefaultResultType | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [sortByValue, setSortByValue] = useState("buzzing");
  const [isLoading, setIsLoading] = useState(false);
  const [isMoreComment, setIsMoreComment] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [commentInput, setCommentInput] = useState("");
  const [commentInputError, setCommentInputError] = useState("");
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [voteID, setVoteID] = useState<number | null>(null);
  const [voteStatus, setVoteStatus] = useState<number | null>(null);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [downvoteCount, setDownvoteCount] = useState(0);
  const [voteLoading, setVoteLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkID, setBookmarkID] = useState<number | null>(null);
  const [isBookmark, setIsBookmark] = useState(false);
  const commentDivRef = useRef<HTMLDivElement | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const [showNotLogin, setShowNotLogin] = useState(false);
  const [showEditPost, setShowEditPost] = useState(false);
  const [editContentInput, setEditContentInput] = useState("");
  const [editContentInputError, setEditContentInputError] = useState("");
  const [editTitleInput, setEditTitleInput] = useState("");
  const [editTitleInputError, setEditTitleInputError] = useState("");
  const [tagArr, setTagArr] = useState<TagDefaultType[]>([]);
  const moreMenuOpen = Boolean(menuAnchorEl);
  const [tagName, setTagName] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const postPageDivRef = useRef<HTMLDivElement | null>(null);

  function handleMoreMenuClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  }
  function handleMoreMenuClose() {
    setMenuAnchorEl(null);
  }
  const limit = 10;

  useEffect(() => {
    if (!buzz_url) {
      navigate("/buzzbee/404");
    }
    const mainDiv = postPageDivRef.current;
    if (!mainDiv) return;

    setCommentPlaceholder(getCommentInputPlaceholder());
    retrievePostDetails();
    retrieveAllTags();

    const handleScroll = () => {
      if (mainDiv.scrollTop > 300) {
        document
          .getElementById("post-page-scroll-to-top-btn")
          ?.classList.remove("fade-out");
      } else {
        document
          .getElementById("post-page-scroll-to-top-btn")
          ?.classList.add("fade-out");
      }
      setTimeout(() => {
        setShowScrollToTop(mainDiv.scrollTop > 300);
      }, 200);
    };
    mainDiv.addEventListener("scroll", handleScroll);
    return () => mainDiv.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    retrievePostComments();
  }, [postInfo]);

  async function retrievePostDetails() {
    try {
      const payload = { user_id: user?.user_id ?? 0, post_url: buzz_url ?? "" };
      const postData = await getPostByURL(payload);
      const formattedPostDate = {
        ...postData,
        created_date: calculateDate(postData.created_date),
      };
      setVoteID(formattedPostDate.vote_id);
      setVoteStatus(formattedPostDate.vote_status);
      setUpvoteCount(formattedPostDate.upvote_count);
      setDownvoteCount(formattedPostDate.downvote_count);
      setBookmarkID(formattedPostDate.bookmark_id);
      setIsBookmark(formattedPostDate.is_bookmarked);
      setPostInfo(formattedPostDate);
      setTagName(formattedPostDate.tag_name ?? "none");
      setEditContentInput(formattedPostDate.content);
      setEditTitleInput(formattedPostDate.title);
      setPostContent(formattedPostDate.content);
      setPostTitle(formattedPostDate.title);
    } catch (error) {
      navigate("/buzzbee/404");
    }
  }

  async function retrievePostComments() {
    try {
      setIsLoading(true);
      const payload = {
        post_id: postInfo?.post_id ? postInfo.post_id : 0,
        user_id: user?.user_id ? user.user_id : 0,
        limit: limit,
        sort_by: sortByValue,
        cursor: cursor,
      };
      const result = await getCommentsByPostId(payload);
      const commentsResult = result.result;

      setCursor(result.cursor);
      if (result.cursor) {
        setIsMoreComment(true);
      } else {
        setIsMoreComment(false);
      }
      const mainCommentsArr: CommentReplyChildArray[] = buildTree(
        commentsResult.map((ele) => ({
          ...ele,
          created_date: calculateDate(ele.created_date),
          replyChildren: [],
        })),
      );

      setCommentsArr((prev) => {
        const prevArray = [...prev];
        mainCommentsArr.forEach((mainEle) => {
          if (
            !prevArray.some(
              (prevEle) => prevEle.comment_id == mainEle.comment_id,
            )
          ) {
            prevArray.push(mainEle);
          }
        });
        return prevArray;
      });
    } catch (e) {
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }

  async function createComment() {
    try {
      if (commentInput.trim().length == 0) {
        toast.error("comment cannot be empty", {
          autoClose: 3000,
        });
        setIsCommentLoading(false);
        return;
      }
      setIsCommentLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        post_id: postInfo?.post_id ?? 0,
        token: token,
        content: commentInput,
        parent_comment_id: null,
        user_id: user?.user_id ?? 0,
      };
      const result = await addNewComment(payload);
      const resultJSON = {
        ...result,
        created_date: calculateDate(result.created_date),
        replyChildren: [],
      };
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success("comment is successfully added!", {
        autoClose: 2000,
      });
      setCommentsArr((prev) => [...prev, resultJSON]);
      setCommentInput("");
    } catch (e) {
      toast.error("comment is not added! error!", {
        autoClose: 2000,
      });
    } finally {
      setIsCommentLoading(false);
    }
  }

  async function removePost() {
    try {
      setIsEditLoading(true);
      await deletePost(postInfo?.post_id ?? 0);
      toast.success("Buzz is successfully deleted! ", {
        autoClose: 2000,
      });
      setTimeout(() => {
        toast.success("navigating to homepage", {
          autoClose: 1000,
        });
        navigate("/");
      }, 1000);
    } catch (e) {
      toast.error("Buzz is not deleted! error!", {
        autoClose: 2000,
      });
    } finally {
      setTimeout(() => {
        setIsEditLoading(false);
      }, 2000);
    }
  }

  function clickVoteBtn(newVote: 1 | -1, e: React.SyntheticEvent) {
    e.stopPropagation();
    //check if user is a login member
    if (!user) {
      displayNotLogin();
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
        post_id: postInfo?.post_id ?? 0,
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
      displayNotLogin();
      return;
    } else if (!bookmarkID) {
      try {
        setBookmarkLoading(true);
        const token = localStorage.getItem("token");
        const payload = {
          user_id: user.user_id,
          post_id: postInfo?.post_id ?? 0,
          token: token,
        };
        const newBookmarkID = await addPostBookmark(payload);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setBookmarkID(newBookmarkID);
        setIsBookmark(true);
      } catch (error) {
      } finally {
        setBookmarkLoading(false);
      }
    } else {
      await deletePostBookmark(bookmarkID);
      setBookmarkID(null);
      setIsBookmark(false);
    }
  }

  async function editPost() {
    try {
      setIsEditLoading(true);
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
        tagArr.find((ele) => ele.tag_name == tagName)?.tag_id ?? null;
      const payload = {
        title: editTitleInput,
        tag_id: tagID,
        post_id: postInfo?.post_id ?? 0,
        token: token,
        content: editContentInput,
      };
      const result = await updatePost(payload);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setTagName(
        tagArr.find((ele) => ele.tag_id == result?.tag_id)?.tag_name ?? "none",
      );
      setPostTitle(result.title);
      setPostContent(result.content);
      setShowEditPost(false);
      setMenuAnchorEl(null);
      toast.success(`Buzz is updated!`, {
        autoClose: 2000,
      });
    } catch (e) {
    } finally {
      setTimeout(() => {
        setIsEditLoading(false);
      }, 2000);
    }
  }

  function scrollToCommentDiv() {
    if (commentDivRef.current) {
      commentDivRef?.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function displayNotLogin() {
    setShowNotLogin(true);
  }

  async function retrieveAllTags() {
    try {
      const result = await getAllTags();
      setTagArr(result);
    } catch (e) {}
  }

  return (
    <div id="post-page-container">
      <NotLogin
        isShown={showNotLogin}
        onClose={() => {
          setShowNotLogin(false);
        }}
      />

      <Loading
        isLoading={isEditLoading}
            variant="success"
        style={{
          filter: "drop-shadow(0px 0px 10px #82828256)",
        }}
      />

      {showScrollToTop && (
        <button
          id="post-page-scroll-to-top-btn"
          className={`main-page-scroll-to-top btn main-page-scroll-to-top-btn ${
            showScrollToTop ? "show" : ""
          }`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            document.querySelector(".post-page-main-div")?.scrollTo({
              top: 0,
              left: 0,
              behavior: "smooth",
            });
          }}
        >
          <img
            src={BuzzBeeScrollToTop}
            id=""
            className="main-page-scroll-to-top-img fade-in"
          />
        </button>
      )}
      <div id="post-page-main-div" ref={postPageDivRef}>
        {/*Post Div*/}
        {postInfo && (
          <div className="post-page-post-main-div fade-in">
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
                    {tagArr.map((tagEle) => (
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
                        setEditTitleInputError(
                          "must be less than 150 characters",
                        );
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
                            editTitleInputError.trim().length > 0
                              ? "2px"
                              : "1.5px",
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
                        setEditContentInputError(
                          "must be less than 3000 characters",
                        );
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
                            editContentInputError.trim().length > 0
                              ? "2px"
                              : "1.5px",
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
                    disabled={isEditLoading}
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
                  <div className="post-page-post-top-header">
                    <div className=" d-flex justify-content-between align-items-center">
                      <div>
                        <div className="post-page-post-topic-div d-flex align-items-center">
                          <i
                            className={`${postInfo.category_icon} post-page-post-topic-icon`}
                          />
                          <p className="m-0">{postInfo.topic_name}</p>
                        </div>
                      </div>
                      <div className="post-postpage-comment-top-header-end">
                        <p className="post-page-post-created-date m-0">
                          {postInfo.created_date}
                        </p>
                        {(user?.user_id == postInfo.user_id ||
                          postInfo.topic_user_id == user?.user_id) && (
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
                                    boxShadow:
                                      "0px 0px 10px rgba(83, 47, 18, 0.15)",
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
                              {user?.user_id == postInfo.user_id && (
                                <MenuItem
                                  style={{
                                    borderBottom:
                                      "1.5px solid var(--honey-yellow)",
                                  }}
                                  onClick={() => {
                                    setShowEditPost(true);
                                  }}
                                >
                                  <p className="post-postpage-comment-more-menu-label">
                                    edit buzz{" "}
                                    <i className="fa-solid fa-pencil" />
                                  </p>
                                </MenuItem>
                              )}
                              <MenuItem
                                onClick={() => {
                                  removePost();
                                }}
                              >
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
                    <div className="post-page-post-username-div d-flex align-items-center">
                      <div className="post-page-post-username-img">
                        <img
                          src={require(`../images/${postInfo.user_image}`)}
                        />
                      </div>
                      {user?.user_id == postInfo.user_id ? (
                        <p
                          className="m-0"
                          style={{
                            color: "rgb(255, 191, 54)",
                            filter:
                              "drop-shadow(0px 0px 0px rgba(31, 18, 6, 0))",
                          }}
                        >
                          Me
                        </p>
                      ) : (
                        <div>
                          <p className="m-0 post-page-post-display-name">
                            {postInfo.display_name}
                          </p>
                          {postInfo.display_name !== postInfo.username && (
                            <p className="m-0 post-page-post-username">
                              @{postInfo.username}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="post-page-post-title-content-div">
                    <h2 className="post-page-post-title">{postTitle}</h2>
                    <div className="post-page-post-content-div">
                      <p className="post-page-post-content">{postContent}</p>
                    </div>
                  </div>
                </div>
                <div className="post-page-post-bottom-footer d-flex align-items-center">
                  <div
                    className="d-flex post-page-post-rate-div post-page-post-bottom-footer-div"
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
                          className={`fa-${voteStatus == 1 ? "solid" : "regular"} fa-thumbs-up post-page-post-rate-icon post-page-post-bottom-footer-icon ${voteLoading ? "disabled" : ""}`}
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
                          className={`fa-${voteStatus == -1 ? "solid" : "regular"} fa-thumbs-down post-page-post-rate-icon post-page-post-bottom-footer-icon ${voteLoading ? "disabled" : ""}`}
                        />
                      </button>
                    </div>
                  </div>
                  <div
                    className="post-page-post-bottom-footer-div post-page-post-comment-div d-flex align-items-center"
                    onClick={() => {
                      scrollToCommentDiv();
                    }}
                  >
                    <button type="button" className="empty-button">
                      <i className="fa-regular fa-comment post-page-post-comment-icon post-page-post-bottom-footer-icon" />
                    </button>
                    <p className="m-0 post-page-post-comment-label">
                      {postInfo.comment_count}
                    </p>{" "}
                  </div>
                  <div
                    className="post-page-post-bottom-footer-div"
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
                        onClick={(e) => {
                          clickBookmarkBtn(e);
                        }}
                        className={`fa${isBookmark ? "-solid" : "-regular"} fa-bookmark post-page-bookmark-icon post-page-post-bottom-footer-icon ${bookmarkLoading ? "disabled" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/*Comments*/}
      </div>
      {/*Add Comment */}
      {user?.user_id && (
        <div className="post-page-add-comment-div" ref={commentDivRef}>
          <div className="post-page-comment-textfield-div">
            <TextField
              size="small"
              placeholder={commentPlaceholder}
              multiline
              fullWidth
              value={commentInput}
              disabled={isCommentLoading || showEditPost}
              className="post-page-comment-textfield"
              onChange={(e) => {
                const value = e.target.value;
                if (value.trim().length > 3000) {
                  setCommentInputError("must be less than 3000 characters");
                } else {
                  setCommentInputError("");
                  setCommentInput(value);
                }
              }}
              onBlur={() => {
                setCommentInputError("");
              }}
              sx={{
                "& .MuiInputBase-input::placeholder": {
                  color: "#4326166a",
                  textShadow: " 0.2px 0 currentColor",
                },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "15px",
                  padding: "10px 12px",
                  fontSize: "14.5px",
                  fontFamily: "Segoe UI",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor:
                      commentInputError.trim().length > 0
                        ? "var(--oak-red)"
                        : "#aa946f86",
                    borderWidth:
                      commentInputError.trim().length > 0 ? "2px" : "1.5px",
                  },
                  "&.Mui-focused": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        commentInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "var(--honey-yellow)",
                    },
                  },
                  "&:hover:not(.Mui-focused)": {
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor:
                        commentInputError.trim().length > 0
                          ? "var(--oak-red)"
                          : "#ffc13b91",
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
              className={`mt-1 d-flex justify-content-${commentInputError.trim().length > 0 ? "between" : "end"} align-items-center`}
            >
              {commentInputError.trim().length > 0 && (
                <p className="post-page-comment-textfield-error">
                  {commentInputError}
                </p>
              )}
              <p className="post-page-comment-textfield-end-adornment">
                <span
                  style={{
                    color:
                      commentInputError.length > 0
                        ? "var(--oak-red)"
                        : " rgba(128, 128, 128, 0.5)",
                  }}
                >
                  {commentInput.trim().length}
                </span>
                /3000
              </p>
            </div>
            <div className="d-flex justify-content-end align-items-center comment-component-reply-btn-div">
              <button
                type="button"
                disabled={
                  isCommentLoading ||
                  showEditPost ||
                  commentInput.trim().length == 0
                }
                className="btn comment-component-reply-btn honeyyellow-woodbrown-woodbrown creamyellow-branchbrown-branchbrown-hover"
                onClick={() => {
                  createComment();
                }}
              >
                submit
              </button>
            </div>
          </div>

          <Loading
            isLoading={isCommentLoading}
            variant="success"
            style={{
              filter: "drop-shadow(0px 0px 10px #82828256)",
            }}
          />
        </div>
      )}

      <div id="post-page-comments-main-div">
        <CommentList
          commentArr={commentsArr}
          onNotLogin={displayNotLogin}
          isPostEdit={showEditPost}
        />
        <div className="post-page-comments-load-more">
          {isMoreComment &&
            (isLoading ? (
              <Loading
                isLoading={isLoading}
                position="static"
                variant="success"
                style={{
                  filter: "drop-shadow(0px 0px 10px #82828256)",
                }}
              />
            ) : (
              <button
                disabled={isLoading}
                onClick={() => {
                  retrievePostComments();
                }}
                type="button"
                className="post-page-load-more-btn btn "
              >
                Load More?
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
