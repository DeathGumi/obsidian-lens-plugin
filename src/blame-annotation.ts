import { BlameInfo, formatRelativeTime } from "./git-blame";

const ANNOTATION_CLASS = "obsidian-lens-annotation";
const MAX_SUMMARY_LENGTH = 40;

export const removeBlameAnnotation = (): void => {
	document.querySelector(`.${ANNOTATION_CLASS}`)?.remove();
};

const truncate = (text: string, max: number): string =>
	text.length > max ? text.slice(0, max - 1) + "…" : text;

/** Finds the tightest bounding rect around the line's actual visible text. */
const getTextEndRect = (lineEl: HTMLElement): DOMRect => {
	const range = document.createRange();
	range.selectNodeContents(lineEl);
	const rects = range.getClientRects();

	for (let i = rects.length - 1; i >= 0; i--) {
		const rect = rects[i];
		if (rect && rect.width > 0) return rect;
	}

	return lineEl.getBoundingClientRect();
};

export const showBlameAnnotation = (
	blame: BlameInfo,
	lineEl: HTMLElement,
	onHover: (x: number, y: number) => void
): void => {
	removeBlameAnnotation();

	const rect = getTextEndRect(lineEl);

	const annotation = document.createElement("span");
	annotation.className = ANNOTATION_CLASS;

	const label = blame.isUncommitted
		? `${blame.author}, Uncommitted`
		: `${blame.author}, ${formatRelativeTime(blame.authorTime)} • ${truncate(blame.summary, MAX_SUMMARY_LENGTH)}`;

	annotation.setText(label);

	annotation.style.left = `${rect.right + 12}px`;
	annotation.style.top = `${rect.top}px`;

	annotation.addEventListener("mouseenter", () => {
		const annotationRect = annotation.getBoundingClientRect();
		onHover(annotationRect.left, annotationRect.bottom + 4);
	});

	document.body.appendChild(annotation);
};
