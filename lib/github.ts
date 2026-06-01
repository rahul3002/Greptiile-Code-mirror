import axios from "axios";

export interface RepositorySnapshot {
  fullName: string;
  branch: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
  latestCommitSha: string;
}

interface GitHubRepoResponse {
  full_name: string;
  default_branch: string;
  private: boolean;
  html_url: string;
}

interface GitHubBranchResponse {
  name: string;
  commit: {
    sha: string;
  };
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: process.env.GITHUB_TOKEN ? `Bearer ${process.env.GITHUB_TOKEN}` : undefined,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function normalizeRepoName(repo: string) {
  return repo.trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
}

export async function validateGitHubRepository(
  repo: string,
  branch: string
): Promise<RepositorySnapshot> {
  const normalizedRepo = normalizeRepoName(repo);
  const normalizedBranch = branch.trim();
  const repoPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

  if (!repoPattern.test(normalizedRepo)) {
    throw new Error("Repository must use owner/repository format.");
  }

  if (!normalizedBranch) {
    throw new Error("Branch name is required.");
  }

  let repoResponse;
  let branchResponse;

  try {
    repoResponse = await axios.get<GitHubRepoResponse>(`https://api.github.com/repos/${normalizedRepo}`, {
      headers: githubHeaders(),
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error(`GitHub repository not found or not accessible: ${normalizedRepo}.`);
    }
    throw error;
  }

  try {
    branchResponse = await axios.get<GitHubBranchResponse>(
      `https://api.github.com/repos/${normalizedRepo}/branches/${encodeURIComponent(
        normalizedBranch
      )}`,
      {
        headers: githubHeaders(),
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error(`GitHub branch not found in ${normalizedRepo}: ${normalizedBranch}.`);
    }
    throw error;
  }

  return {
    fullName: repoResponse.data.full_name,
    branch: branchResponse.data.name,
    defaultBranch: repoResponse.data.default_branch,
    private: repoResponse.data.private,
    htmlUrl: repoResponse.data.html_url,
    latestCommitSha: branchResponse.data.commit.sha,
  };
}
