const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".pdf", ".zip", ".tar", ".gz", ".rar",
  ".exe", ".dll", ".so", ".dylib",
  ".ttf", ".woff", ".woff2", ".eot",
  ".mp4", ".mp3", ".wav", ".avi",
  ".psd", ".ai", ".sketch",
  ".pyc", ".class",
]);

const IGNORED_PATHS = [
  /^node_modules\//,
  /^\.next\//,
  /^dist\//,
  /^build\//,
  /^\.git\//,
  /^coverage\//,
  /^\.cache\//,
];

const IGNORED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
]);

/**
 * Builds GitHub API request headers.
 * Token priority: project-level token → server-level GITHUB_TOKEN env var → unauthenticated.
 */
function githubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const resolved = token || process.env.GITHUB_TOKEN || undefined;
  if (resolved && resolved.trim()) {
    headers.Authorization = `Bearer ${resolved}`;
  }
  return headers;
}

export function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  // HTTPS: https://github.com/owner/repo or https://github.com/owner/repo.git
  const httpsMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  return null;
}

async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers: githubHeaders(token) }
  );
  if (!response.ok) {
    const status = response.status;
    if (status === 404) throw Object.assign(new Error("Repository not found"), { githubStatus: 404 });
    if (status === 401) throw Object.assign(new Error("Bad GitHub token — check GITHUB_TOKEN in .env"), { githubStatus: 401 });
    if (status === 403 || status === 429) throw Object.assign(new Error("GitHub rate limit reached"), { githubStatus: 403 });
    throw Object.assign(new Error(`GitHub API error: ${status}`), { githubStatus: status });
  }
  const data = await response.json();
  return data.default_branch ?? "main";
}

export async function getFileTree(owner: string, repo: string, token?: string): Promise<string[]> {
  const branch = await getDefaultBranch(owner, repo, token);

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: githubHeaders(token) }
  );

  if (!response.ok) {
    const status = response.status;
    if (status === 404) {
      throw Object.assign(new Error("Repository not found"), { githubStatus: 404 });
    }
    if (status === 403 || status === 429) {
      throw Object.assign(new Error("GitHub rate limit reached"), { githubStatus: 403 });
    }
    throw Object.assign(new Error(`GitHub API error: ${status}`), { githubStatus: status });
  }

  const data = await response.json();

  if (data.truncated) {
    console.warn(`[github] Tree truncated for ${owner}/${repo} — repo has >100k files`);
  }

  return (data.tree as { type: string; path: string }[])
    .filter((entry) => {
      if (entry.type !== "blob") return false;
      const path = entry.path;

      // Skip ignored path prefixes
      if (IGNORED_PATHS.some((re) => re.test(path))) return false;

      // Skip lock files and specific ignored filenames
      const filename = path.split("/").pop() ?? "";
      if (IGNORED_FILES.has(filename)) return false;

      // Skip minified JS
      if (filename.endsWith(".min.js")) return false;

      // Skip binary extensions
      const ext = filename.includes(".") ? "." + filename.split(".").pop()!.toLowerCase() : "";
      if (BINARY_EXTENSIONS.has(ext)) return false;

      return true;
    })
    .map((entry) => entry.path);
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<{ path: string; content: string }> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    { headers: githubHeaders(token) }
  );

  if (!response.ok) {
    throw new Error(`GitHub: failed to fetch ${path} (${response.status})`);
  }

  const data = await response.json();

  if (data.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error(`GitHub: unexpected encoding for ${path}`);
  }

  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  const lines = decoded.split("\n");

  if (lines.length <= 500) {
    return { path, content: decoded };
  }

  const truncated = lines.slice(0, 500).join("\n");
  return {
    path,
    content: `${truncated}\n\n... [truncated, file has ${lines.length - 500} more lines]`,
  };
}
