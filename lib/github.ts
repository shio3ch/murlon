const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

/**
 * リポジトリ一覧を取得
 */
export async function fetchRepos(accessToken: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github+json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`GitHub APIエラー: ${res.status}`);
  }

  return res.json();
}

/**
 * コミット一覧を取得
 */
export async function fetchCommits(
  accessToken: string,
  owner: string,
  repo: string,
  since?: string,
  until?: string,
): Promise<GitHubCommit[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (since) params.set("since", since);
  if (until) params.set("until", until);

  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?${params}`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github+json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`GitHub APIエラー: ${res.status}`);
  }

  return res.json();
}

/**
 * GitHubユーザー情報を取得
 */
export async function fetchGitHubUser(
  accessToken: string,
): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub APIエラー: ${res.status}`);
  }

  return res.json();
}

/**
 * アクセストークンを取得（OAuth code交換）
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub OAuth トークン交換に失敗しました: ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`GitHub OAuth エラー: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

/**
 * コミットをEntry形式のcontentに変換
 */
export function formatCommitAsEntry(
  commit: GitHubCommit,
  repoName: string,
): string {
  const message = commit.commit.message.split("\n")[0]; // 最初の行のみ
  return `[GitHub] ${repoName}: ${message}`;
}
