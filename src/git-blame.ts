import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface BlameInfo {
	author: string;
	authorTime: number; // unix timestamp (seconds)
	summary: string;
	isUncommitted: boolean;
	commitHash: string;
}

/**
 * Runs `git blame` on a single line of a file and parses the porcelain output.
 * @param vaultPath - absolute path to the vault root (used as cwd)
 * @param relativeFilePath - path to the file relative to the vault root
 * @param lineNumber - 1-indexed line number
 */
export const getLineBlame = async (
	vaultPath: string,
	relativeFilePath: string,
	lineNumber: number
): Promise<BlameInfo | null> => {
	const command = `git blame --porcelain -L ${lineNumber},${lineNumber} -- "${relativeFilePath}"`;

	try {
		const { stdout } = await execAsync(command, { cwd: vaultPath });
		return parsePorcelain(stdout);
	} catch (err) {
		console.error("obsidian-lens: git blame failed", err);
		return null;
	}
};

const parsePorcelain = (output: string): BlameInfo | null => {
	const lines = output.split("\n");

	let author: string | undefined;
	let authorTime: number | undefined;
	let summary = "";
	const commitHash = lines[0]?.split(" ")[0] ?? "";

	for (const line of lines) {
		if (line.startsWith("author-time ")) {
			authorTime = parseInt(line.slice("author-time ".length), 10);
		} else if (line.startsWith("author ")) {
			author = line.slice("author ".length);
		} else if (line.startsWith("summary ")) {
			summary = line.slice("summary ".length);
		}
	}

	if (!author || authorTime === undefined) {
		return null;
	}

	const isUncommitted = author === "Not Committed Yet";

	return {
		author: isUncommitted ? "You" : author,
		authorTime,
		summary,
		isUncommitted,
		commitHash,
	};
};

/**
 * Reads the repo's `origin` remote URL and converts it to a browsable
 * GitHub base URL, e.g. "https://github.com/owner/repo".
 * Returns null if there's no remote or it isn't a GitHub URL.
 */
export const getGithubRepoUrl = async (vaultPath: string): Promise<string | null> => {
	try {
		const { stdout } = await execAsync("git config --get remote.origin.url", {
			cwd: vaultPath,
		});
		const remote = stdout.trim();

		const match = remote.match(/github\.com[:/](.+?)(\.git)?$/);
		if (!match) return null;

		return `https://github.com/${match[1]}`;
	} catch (err) {
		console.error("obsidian-lens: could not resolve remote URL", err);
		return null;
	}
};

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Formats a unix timestamp (seconds) as a short relative time string, e.g. "3 days ago". */
export const formatRelativeTime = (unixSeconds: number): string => {
	const diff = Math.max(0, Date.now() / 1000 - unixSeconds);

	const units: [number, string][] = [
		[YEAR, "year"],
		[MONTH, "month"],
		[DAY, "day"],
		[HOUR, "hour"],
		[MINUTE, "minute"],
	];

	for (const [unitSeconds, label] of units) {
		if (diff >= unitSeconds) {
			const count = Math.floor(diff / unitSeconds);
			return `${count} ${label}${count === 1 ? "" : "s"} ago`;
		}
	}

	return "just now";
};
