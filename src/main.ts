import { MarkdownView, Notice, Plugin } from "obsidian";
import { getLineBlame, getGithubRepoUrl } from "./git-blame";
import { showBlameAnnotation, removeBlameAnnotation } from "./blame-annotation";
import { showBlamePopup, removeBlamePopup } from "./blame-popup";

export default class ObsidianLensPlugin extends Plugin {
	private githubUrl: string | null = null;

	async onload() {
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			this.handleEditorClick(evt);
		});
	}

	onunload() {
		removeBlameAnnotation();
		removeBlamePopup();
	}

	handleEditorClick(evt: MouseEvent) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !view.editor) return;

		const target = evt.target as HTMLElement | null;
		if (!target) return;
		const isInEditor = view.containerEl.contains(target);
		if (!isInEditor) return;

		if (target.closest(".obsidian-lens-annotation, .obsidian-lens-popup")) return;

		const lineEl = target.closest(".cm-line") as HTMLElement | null;
		if (!lineEl) return;

		const editor = view.editor;
		const cursor = editor.getCursor();
		const lineNumber = cursor.line + 1;

		const file = view.file;
		if (!file) return;

		const vaultPath = this.getVaultAbsolutePath();
		if (!vaultPath) {
			new Notice("obsidian-lens: could not resolve vault path");
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

		showBlameAnnotation(blame, lineEl, (x, y) => {
			showBlamePopup(blame, x, y, this.githubUrl);
		});
	}

	getVaultAbsolutePath(): string | null {
		const adapter = this.app.vault.adapter;
		const anyAdapter = adapter as unknown as { basePath?: string };
		return anyAdapter.basePath ?? null;
	}
}