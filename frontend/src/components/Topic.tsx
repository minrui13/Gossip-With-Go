import { TopicProp } from "../types/TopicsType";
import "../css/topic.css";
import { useAuth } from "../auth/Auth";

export function Topic({ topicData }: TopicProp) {
  const { user } = useAuth();
  return (
    <div className="topic-item-main-div fade-in">
      <div
        className="d-flex justify-content-between flex-column"
        style={{ gap: 10 }}
      >
        <div className="topic-item-top-header">
          <h2 className="topic-item-heading">
            <i className={`${topicData.category_icon}`} />/
            {topicData.topic_name}
          </h2>
          <div className="post-postpage-comment-top-header-end">
            <p className="topic-item-created-date m-0">
              {topicData.created_date}
            </p>
          </div>
        </div>
        <div>
          <p className="topic-item-description">{topicData.description}</p>
        </div>
        <div>
          <div className="topic-item-followers-posts-div">
            <div>
              <p className="topic-item-followers-posts">
                <span className="topic-item-followers-posts-numbers">
                  {topicData.followers_count}
                </span>{" "}
                <span className="topic-item-followers-posts-labels">
                  {" "}
                  Followers{" "}
                </span>
              </p>
            </div>
            <div>
              <p className="topic-item-followers-posts">
                <span className="topic-item-followers-posts-numbers">
                  {topicData.posts_count}
                </span>{" "}
                <span className="topic-item-followers-posts-labels">Buzz</span>
              </p>
            </div>
          </div>
          <div>
            <div className="topic-item-created-by">
              <span>Created by:</span>
              <div>
                {user?.user_id == topicData.topic_user_id ? (
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
                    <p className="m-0 post-item-display-name">
                      {topicData.display_name}
                    </p>
                    {topicData.display_name !== topicData.username && (
                      <p className="m-0 post-item-username">
                        @{topicData.username}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
