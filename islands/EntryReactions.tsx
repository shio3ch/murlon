import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

const EMOJI_LIST = ["👍", "❤️", "🎉", "😊", "🤔"];

interface ReactionData {
  emoji: string;
  count: number;
  myReaction: boolean;
}

interface CommentData {
  id: string;
  entryId: string;
  userId: string;
  content: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

interface EntryReactionsProps {
  entryId: string;
  currentUserId: string;
}

function highlightMentions(text: string) {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} class="font-bold text-brand-600">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function EntryReactions({ entryId, currentUserId }: EntryReactionsProps) {
  const reactions = useSignal<ReactionData[]>([]);
  const comments = useSignal<CommentData[]>([]);
  const showComments = useSignal(false);
  const commentText = useSignal("");
  const submitting = useSignal(false);
  const loadingReactions = useSignal(true);
  const loadingComments = useSignal(false);
  const commentCount = useSignal(0);

  useEffect(() => {
    fetchReactions();
    fetchCommentCount();
  }, []);

  async function fetchReactions() {
    try {
      const res = await fetch(`/api/entries/${entryId}/reactions`);
      const json = await res.json();
      if (json.success) {
        reactions.value = json.data;
      }
    } finally {
      loadingReactions.value = false;
    }
  }

  async function fetchCommentCount() {
    try {
      const res = await fetch(`/api/entries/${entryId}/comments`);
      const json = await res.json();
      if (json.success) {
        commentCount.value = json.data.length;
        comments.value = json.data;
      }
    } catch {
      // ignore
    }
  }

  async function toggleReaction(emoji: string) {
    try {
      const res = await fetch(`/api/entries/${entryId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const json = await res.json();
      if (json.success) {
        reactions.value = json.data;
      }
    } catch {
      // ignore
    }
  }

  async function handleExpandComments() {
    showComments.value = !showComments.value;
    if (showComments.value && comments.value.length === 0 && commentCount.value > 0) {
      loadingComments.value = true;
      try {
        const res = await fetch(`/api/entries/${entryId}/comments`);
        const json = await res.json();
        if (json.success) {
          comments.value = json.data;
          commentCount.value = json.data.length;
        }
      } finally {
        loadingComments.value = false;
      }
    }
  }

  async function handleSubmitComment(e: Event) {
    e.preventDefault();
    const content = commentText.value.trim();
    if (!content) return;

    submitting.value = true;
    try {
      const res = await fetch(`/api/entries/${entryId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.success) {
        comments.value = [...comments.value, json.data];
        commentCount.value = commentCount.value + 1;
        commentText.value = "";
      }
    } finally {
      submitting.value = false;
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("このコメントを削除しますか？")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        comments.value = comments.value.filter((c) => c.id !== commentId);
        commentCount.value = commentCount.value - 1;
      }
    } catch {
      // ignore
    }
  }

  function getReactionMap(): Map<string, ReactionData> {
    const map = new Map<string, ReactionData>();
    for (const r of reactions.value) {
      map.set(r.emoji, r);
    }
    return map;
  }

  if (loadingReactions.value) {
    return null;
  }

  const reactionMap = getReactionMap();

  return (
    <div class="mt-1.5">
      {/* Reaction buttons */}
      <div class="flex items-center gap-1 flex-wrap">
        {EMOJI_LIST.map((emoji) => {
          const data = reactionMap.get(emoji);
          const count = data?.count ?? 0;
          const isActive = data?.myReaction ?? false;

          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggleReaction(emoji)}
              class={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
                isActive
                  ? "bg-brand-100 border border-brand-300 text-brand-700"
                  : "bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span class="min-w-[0.75rem] text-center">{count}</span>}
            </button>
          );
        })}

        {/* Comment toggle button */}
        <button
          type="button"
          onClick={handleExpandComments}
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors ml-1"
        >
          <span>💬</span>
          <span>{commentCount.value > 0 ? `${commentCount.value}件` : "コメント"}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments.value && (
        <div class="mt-2 ml-2 pl-2 border-l-2 border-gray-100">
          {loadingComments.value ? <p class="text-xs text-gray-400 py-1">読み込み中...</p> : (
            <>
              {comments.value.length > 0 && (
                <div class="space-y-1.5 mb-2">
                  {comments.value.map((comment) => (
                    <div key={comment.id} class="group/comment flex gap-2 text-xs">
                      <div class="flex-1 min-w-0">
                        <span class="font-medium text-gray-700">{comment.userName}</span>
                        <span class="text-gray-400 ml-1.5">
                          {new Date(comment.createdAt).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <p class="text-gray-600 mt-0.5 whitespace-pre-wrap break-words">
                          {highlightMentions(comment.content)}
                        </p>
                      </div>
                      {comment.userId === currentUserId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          class="opacity-0 group-hover/comment:opacity-100 text-gray-400 hover:text-red-500 shrink-0 transition-opacity"
                          title="削除"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Comment form */}
              <form onSubmit={handleSubmitComment} class="flex gap-1.5">
                <input
                  type="text"
                  class="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-300"
                  placeholder="コメントを入力..."
                  value={commentText.value}
                  onInput={(e) => (commentText.value = (e.target as HTMLInputElement).value)}
                  maxLength={500}
                  disabled={submitting.value}
                />
                <button
                  type="submit"
                  disabled={submitting.value || commentText.value.trim().length === 0}
                  class="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  送信
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
