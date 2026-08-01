import { BlameInfo, formatRelativeTime } from "./git-blame";

const POPUP_CLASS = "obsidian-lens-popup";

export const removeBlamePopup = (): void => {
	document.querySelector(`.${POPUP_CLASS}`)?.remove();
};

export interface PopupHoverHandlers {
	onEnter: () => void;
	onLeave: () => void;
}

export const showBlamePopup = (
	blame: BlameInfo,
	x: number,
	y: number,
	githubUrl: string | null,
	handlers: PopupHoverHandlers
): void => {
	removeBlamePopup();

	const popup = createDiv({ cls: POPUP_CLASS });

	const authorEl = popup.createSpan({ cls: "obsidian-lens-author" });
	authorEl.setText(blame.author);

	const timeEl = popup.createSpan({ cls: "obsidian-lens-time" });
	timeEl.setText(` • ${formatRelativeTime(blame.authorTime)}`);

	const summaryText = blame.isUncommitted ? "Uncommitted changes" : blame.summary;
	if (summaryText) {
		const summaryEl = popup.createDiv({ cls: "obsidian-lens-summary" });
		summaryEl.setText(summaryText);
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

	popup.addEventListener("mouseenter", handlers.onEnter);
	popup.addEventListener("mouseleave", handlers.onLeave);

	document.body.appendChild(popup);

	const dismiss = (evt: MouseEvent) => {
		if (!popup.contains(evt.target as Node)) {
			removeBlamePopup();
			document.removeEventListener("mousedown", dismiss);
		}
	};
	window.setTimeout(() => document.addEventListener("mousedown", dismiss), 0);
};
