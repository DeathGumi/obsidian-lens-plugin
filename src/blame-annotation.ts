import { BlameInfo, formatRelativeTime } from "./git-blame";

const ANNOTATION_CLASS = "obsidian-lens-annotation";
const MAX_SUMMARY_LENGTH = 40;
const TEXT_GAP_PX = 128; // Gap between line and actual text of annotation. This is to avoid overlapping with the line number gutter and the fold button.
const HOVER_SHOW_DELAY_MS = 350; // Delay would show up but giving it delay doesn't make it as annoying

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

export interface AnnotationHoverHandlers {
	onEnter: (x: number, y: number) => void;
	onLeave: () => void;
}

export const showBlameAnnotation = (
	blame: BlameInfo,
	lineEl: HTMLElement,
	handlers: AnnotationHoverHandlers
): void => {
	removeBlameAnnotation();

	const rect = getTextEndRect(lineEl);

	const annotation = createSpan({ cls: ANNOTATION_CLASS });

	const summaryText = blame.isUncommitted
		? "Uncommitted changes"
		: truncate(blame.summary, MAX_SUMMARY_LENGTH);
	const label = `${blame.author}, ${formatRelativeTime(blame.authorTime)} • ${summaryText}`;

	annotation.setText(label);

	annotation.style.left = `${rect.right + TEXT_GAP_PX}px`;
	annotation.style.top = `${rect.top + rect.height / 2}px`;

	let showTimeout: number | null = null;

	annotation.addEventListener("mouseenter", () => {
		showTimeout = window.setTimeout(() => {
			showTimeout = null;
			const annotationRect = annotation.getBoundingClientRect();
			handlers.onEnter(annotationRect.left, annotationRect.bottom + 4);
		}, HOVER_SHOW_DELAY_MS);
	});
	annotation.addEventListener("mouseleave", () => {
		if (showTimeout !== null) {
			window.clearTimeout(showTimeout);
			showTimeout = null;
		}
		handlers.onLeave();
	});

	document.body.appendChild(annotation);
};
