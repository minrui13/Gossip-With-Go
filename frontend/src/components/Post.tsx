import { PostDefaultResultType } from "../types/PostType";
import "../css/post.css";
import { use, useRef, useState } from "react";
import { useAuth } from "../auth/Auth";
import { VoteDetails, VoteTypePostVote } from "../types/VoteType";
import {
  addPostVote,
  deletePostVote,
  updatePostVote,
} from "../api/postVotesAPI";
import { addPostBookmark, deletePostBookmark } from "../api/postBookmarksAPI";
import { useNavigate } from "react-router-dom";

export default function Post({
  post_id,
  user_id,
  username,
  user_image,
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
}: PostDefaultResultType) {
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
  const [voteID, setVoteID] = useState(vote_id);
  const [voteStatus, setVoteStatus] = useState(vote_status);
  const [upvoteCount, setUpvoteCount] = useState(upvote_count);
  const [downvoteCount, setDownvoteCount] = useState(downvote_count);

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
      setVoteLoading(true);
      const payload = {
        user_id: user.user_id,
        post_id: post_id,
        vote_type: votenum,
      };
      const postVoteID = await addPostVote(payload);
      if (votenum == -1) {
        setDownvoteCount(downvote_count + 1);
      } else {
        setUpvoteCount(upvote_count + 1);
      }
      setVoteID(postVoteID);
      setVoteStatus(votenum);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setVoteLoading(false);
      }, 1000);
    }
  }

  async function changeVote(voteNum: -1 | 1) {
    try {
      setVoteLoading(true);
      const payload = { post_vote_id: voteID, vote_type: voteNum };
      const newCount = await updatePostVote(payload);
      setDownvoteCount(newCount.downvote_count);
      setUpvoteCount(newCount.upvote_count);
      setVoteStatus(voteNum);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setVoteLoading(false);
      }, 1000);
    }
  }

  async function removeVote() {
    try {
      setVoteLoading(true);
      const newCount = await deletePostVote(voteID);
      setDownvoteCount(newCount.downvote_count);
      setUpvoteCount(newCount.upvote_count);
      setVoteID(null);
      setVoteStatus(null);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => {
        setVoteLoading(false);
      }, 1000);
    }
  }

  async function clickBookmarkBtn(e: React.SyntheticEvent) {
    e.stopPropagation();
    if (!user) {
      return;
    } else if (!bookmarkID) {
      try {
        setBookmarkLoading(true);
        const payload = { user_id: user.user_id, post_id: post_id };
        const newBookmarkID = await addPostBookmark(payload);
        setBookmarkID(newBookmarkID);
        setIsBookmark(true);
      } catch (error) {
        console.error(error);
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
    if (selection && selection.toString().length > 0) {
      return;
    }
    navigate(`/buzz/${post_id}`);
  }

  return (
    <div
      className="post-item-main-div"
      key={post_id}
      onClick={() => {
        navigateToPost();
      }}
    >
      <div
        className="d-flex justify-content-between flex-column"
        style={{ gap: "20px" }}
      >
        <div>
          <div className="post-item-top-header">
            <div className=" d-flex justify-content-between align-items-center">
              <div>
                <div className="post-item-topic-div d-flex align-items-center">
                  <i className={`${category_icon} post-item-topic-icon`} />
                  <p className="m-0">{topic_name}</p>
                </div>
              </div>
              <p className="post-item-created-date m-0">{created_date}</p>
            </div>
            <div className="post-item-username-div d-flex align-items-center">
              <div className="post-item-username-img">
                <img src={require(`../images/${user_image}`)} />
              </div>
              {user?.user_id == user_id ? (
                <p className="m-0" style={{ color: "rgb(255, 191, 54)",  filter: "drop-shadow(0px 0px 0px rgba(31, 18, 6, 0))" }}>
                  Me
                </p>
              ) : (
                <p className="m-0">@{username}</p>
              )}
            </div>
          </div>
          <div className="post-item-title-content-div">
            <h2 className="post-item-title">{title}</h2>
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
                      <i className={`${tag_icon}`} /> {tag_name}
                    </span>
                    <span className="d-block post-item-content-warning-description">
                      {tag_description}
                    </span>
                  </button>
                </div>
              )}

              <div className={`post-item-content-div`}>
                <p className="post-item-content">{content}</p>
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
            <div className="d-flex align-items-center">
              <p className="m-0">{upvoteCount}</p>
              <button
                type="button"
                className="empty-button"
                disabled={voteLoading}
              >
                <i
                  className={`fa${voteStatus == 1 ? "-solid" : "-regular"} fa-thumbs-up post-item-rate-icon post-item-bottom-footer-icon ${voteLoading ? "disabled" : ""}`}
                  onClick={(e) => {
                    clickVoteBtn(1, e);
                  }}
                />
              </button>
            </div>
            <div className="d-flex align-items-center">
              <p className="m-0">{downvoteCount}</p>
              <button
                type="button"
                className="empty-button"
                disabled={voteLoading}
              >
                <i
                  className={`fa${voteStatus == -1 ? "-solid" : "-regular"} fa-thumbs-down post-item-rate-icon post-item-bottom-footer-icon ${voteLoading ? "disabled" : ""}`}
                  onClick={(e) => {
                    clickVoteBtn(-1, e);
                  }}
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
            <p className="m-0">{comment_count}</p>{" "}
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
                className={`fa${isBookmark ? "-solid" : "-regular"} fa-bookmark post-item-bottom-footer-icon  ${bookmarkLoading ? "disabled" : ""}`}
                onClick={(e) => {
                  clickBookmarkBtn(e);
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
