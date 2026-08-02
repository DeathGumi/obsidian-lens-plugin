import { MarkdownView, Notice, Plugin } from "obsidian";
import { getLineBlame, getGithubRepoUrl } from "./git-blame";
import { showBlameAnnotation, removeBlameAnnotation } from "./blame-annotation";
import { showBlamePopup, removeBlamePopup } from "./blame-popup";

const POPUP_HIDE_DELAY_MS = 200;

export default class ObsidianLensPlugin extends Plugin {
	private githubUrl: string | null = null;
	private hidePopupTimeout: number | null = null;

	async onload() {
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			this.handleEditorClick(evt);
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.clearBlame();
			})
		);
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.clearBlame();
			})
		);
		this.registerEvent(
			this.app.workspace.on("editor-change", () => {
				this.clearBlame();
			})
		);
	}

	onunload() {
		this.clearBlame();
	}

	clearBlame() {
		this.cancelHidePopup();
		removeBlameAnnotation();
		removeBlamePopup();
	}

	scheduleHidePopup() {
		this.cancelHidePopup();
		this.hidePopupTimeout = window.setTimeout(() => {
			removeBlamePopup();
		}, POPUP_HIDE_DELAY_MS);
	}

	cancelHidePopup() {
		if (this.hidePopupTimeout !== null) {
			window.clearTimeout(this.hidePopupTimeout);
			this.hidePopupTimeout = null;
		}
	}

	handleEditorClick(evt: MouseEvent) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !view.editor) return;

		const target = evt.target;
		if (!(target instanceof HTMLElement)) return;

		const isInEditor = view.containerEl.contains(target);
		if (!isInEditor) return;

		if (target.closest(".obsidian-lens-annotation, .obsidian-lens-popup")) return;

		const lineEl = target.closest(".cm-line");
		if (!(lineEl instanceof HTMLElement)) return;

		const editor = view.editor;
		const cursor = editor.getCursor();
		const lineNumber = cursor.line + 1;

		if (editor.getLine(cursor.line).trim().length === 0) {
			this.clearBlame();
			return;
		}

		const file = view.file;
		if (!file) return;

		const vaultPath = this.getVaultAbsolutePath();
		if (!vaultPath) {
			new Notice("Obsidian lens: could not resolve vault path");
			return;
		}

		void this.runBlame(vaultPath, file.path, lineNumber, lineEl);
	}

	async runBlame(
		vaultPath: string,
		relativeFilePath: string,
		lineNumber: number,
		lineEl: HTMLElement
	) {
		const blame = await getLineBlame(vaultPath, relativeFilePath, lineNumber);

		if (!blame) {
			removeBlameAnnotation();
			return;
		}

		if (this.githubUrl === null) {
			this.githubUrl = await getGithubRepoUrl(vaultPath);
		}

		showBlameAnnotation(blame, lineEl, {
			onEnter: (x, y) => {
				this.cancelHidePopup();
				showBlamePopup(blame, x, y, this.githubUrl, {
					onEnter: () => this.cancelHidePopup(),
					onLeave: () => this.scheduleHidePopup(),
				});
			},
			onLeave: () => this.scheduleHidePopup(),
		});
	}

	getVaultAbsolutePath(): string | null {
		const adapter = this.app.vault.adapter;
		const anyAdapter = adapter as unknown as { basePath?: string };
		return anyAdapter.basePath ?? null;
	}
}