import { PostDefaultResultType } from "../types/PostType";
import "../css/post.css";
import { useRef, useState } from "react";
import { useAuth } from "../auth/Auth";

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
  const [showContent, setShowContent] = useState(tag_name ? false : true);
  const contentWarningDiv = useRef<HTMLDivElement | null>(null);
  const contentWarningBtn = useRef<HTMLButtonElement | null>(null);
  const [bookmarkID, setBookmarkID] = useState(bookmark_id)
  const [isBookmark, setIsBookmark] = useState(is_bookmarked)
  const [voteID, setVoteID] = useState(vote_id)
  const [voteStatus, setVoteStatus] = useState(vote_status)
  const [upvoteCount, setUpvoteCount] = useState(upvote_count)
  const [downvoteCount, setDownvoteCount] = useState(downvote_count)

  //when click, showContent = false and add transition for the fade.
  function controlShowContent() {
    if (contentWarningDiv?.current && contentWarningBtn?.current) {
      contentWarningDiv.current.classList.add("fade-out");
      contentWarningBtn.current.classList.add("fade-out");
    }

    setTimeout(() => {
      setShowContent(true);
    }, 500);
  }

  function clickLikeBtn(id: number) {}

  function clickDislikeBtn(id: number) {}

  function clickBookmarkBtn(id: number) {

  }

  function navigateToPost() {}

  return (
    <div className="post-item-main-div" key={post_id}>
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
              <p className="post-item-created-date m-0">
                {" "}
                {new Date(created_date).toLocaleDateString()}
              </p>
            </div>
            <div className="post-item-username-div d-flex align-items-center">
              <div className="post-item-username-img">
                <img src={require(`../images/${user_image}`)} />
              </div>
              <p className="m-0">@{username}</p>
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
                    onClick={() => controlShowContent()}
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
          <div className="d-flex post-item-rate-div post-item-bottom-footer-div">
            <div className="d-flex align-items-center">
              <p className="m-0">{upvoteCount}</p>
              <i
                className={`fa${voteStatus == 1 ? "-solid" : "-regular"} fa-thumbs-up post-item-rate-icon post-item-bottom-footer-icon`}
                onClick={() => {
                  clickLikeBtn(voteID);
                }}
              />
            </div>
            <div className="d-flex align-items-center">
              <p className="m-0">{downvote_count}</p>
              <i
                className={`fa${voteStatus == -1 ? "-solid" : "-regular"} fa-thumbs-down post-item-rate-icon post-item-bottom-footer-icon`}
                onClick={() => {
                  clickDislikeBtn(voteID);
                }}
              />
            </div>
          </div>
          <div className="post-item-bottom-footer-div post-item-comment-div d-flex align-items-center">
            <i
              className="fa-regular fa-comment post-item-comment-icon post-item-bottom-footer-icon"
              onClick={() => {
                navigateToPost();
              }}
            />
            <p className="m-0">{comment_count}</p>{" "}
          </div>
          <div className="post-item-bottom-footer-div">
            <i
              className={`fa${isBookmark ? "-solid" : "-regular"} fa-bookmark post-item-bottom-footer-icon`}
              onClick={() => {
                clickBookmarkBtn(bookmarkID);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
