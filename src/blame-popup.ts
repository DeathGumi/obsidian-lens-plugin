import { BlameInfo, formatRelativeTime } from "./git-blame";

const POPUP_CLASS = "obsidian-lens-popup";

export const removeBlamePopup = (): void => {
	document.querySelector(`.${POPUP_CLASS}`)?.remove();
};

export const showBlamePopup = (
	blame: BlameInfo,
	x: number,
	y: number,
	githubUrl: string | null
): void => {
	removeBlamePopup();

	const popup = createDiv({ cls: POPUP_CLASS });

	const authorEl = popup.createSpan({ cls: "obsidian-lens-author" });
	authorEl.setText(blame.author);

	const timeEl = popup.createSpan({ cls: "obsidian-lens-time" });
	timeEl.setText(
		` • ${blame.isUncommitted ? "Uncommitted" : formatRelativeTime(blame.authorTime)}`
	);

	if (blame.summary) {
		const summaryEl = popup.createDiv({ cls: "obsidian-lens-summary" });
		summaryEl.setText(blame.summary);
	}

	if (githubUrl && !blame.isUncommitted && blame.commitHash) {
		const linkEl = popup.createDiv({ cls: "obsidian-lens-link" });
		linkEl.setText("View commit on GitHub →");
		linkEl.addEventListener("click", () => {
			window.open(`${githubUrl}/commit/${blame.commitHash}`, "_blank");
		});
	}

	popup.style.left = `${x}px`;
	popup.style.top = `${y}px`;

	document.body.appendChild(popup);

	const dismiss = (evt: MouseEvent) => {
		if (!popup.contains(evt.target as Node)) {
			removeBlamePopup();
			document.removeEventListener("mousedown", dismiss);
		}
	};
	window.setTimeout(() => document.addEventListener("mousedown", dismiss), 0);
};
