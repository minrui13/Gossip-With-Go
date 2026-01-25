import exp from "constants";

export function calculateDate(otherDate: string) {
  const current = new Date();
  const date = new Date(otherDate);

  const diffMs = current.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Just Now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes > 1 ? "mins" : "min"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours > 1 ? "hours" : "hour"} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays > 1 ? "days" : "day"} ago`;
  }
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getCommentInputPlaceholder(): string {
  const possiblePlaceholder = [
    "share a buzz...",
    "what's buzzing in your mind?",
    "time to buzz in...",
    "drop a buzz...",
    "we know it's buzzing in your head...",
    "we want to hear from you",
    "this buzz is waiting for your buzz",
    "it's stinging me to not hear from you",
  ];

  return possiblePlaceholder[
    Math.floor(Math.random() * possiblePlaceholder.length)
  ];
}
//match string and then bold the part where the string mtaches
export function matchString(matchString: string, string: string) {
  const regex = new RegExp(`(${matchString})`, "ig");
  const parts = string.split(regex);
  return (
    string.trim().length > 0 &&
    parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index}  style={{ fontWeight: 600 }}>{part}</span>
      ) : (
        <span key={index}>
          {part}
        </span>
      ),
    )
  );
}
