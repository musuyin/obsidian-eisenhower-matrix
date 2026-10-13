import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TaskStore } from './data/task-store';
import { DEFAULT_SETTINGS, ObsidianEisenhowerMatrixSettings, ObsidianEisenhowerMatrixSettingTab } from './settings';
import { QuadrantTask } from './types';
import { TaskDraft } from './ui/task-modal';
import { ObsidianEisenhowerMatrixView, VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX } from './ui/quadrant-view';

export default class ObsidianEisenhowerMatrixPlugin extends Plugin {
	settings!: ObsidianEisenhowerMatrixSettings;
	store!: TaskStore;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.store = new TaskStore(this.app.vault, () => this.settings.dataFilePath);
		this.registerView(VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX, (leaf) => new ObsidianEisenhowerMatrixView(leaf, this));
		this.addRibbonIcon('layout-grid', '打开任务四象限', () => void this.activateView());
		this.addCommand({ id: 'open', name: '打开任务四象限', callback: () => void this.activateView() });
		this.addSettingTab(new ObsidianEisenhowerMatrixSettingTab(this.app, this));
		this.registerEvent(this.app.vault.on('modify', (file) => {
			if (file.path === this.settings.dataFilePath) void this.refreshViews();
		}));
		this.registerDomEvent(window, 'resize', () => void this.refreshViews());
	}

	onunload(): void {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX).forEach((leaf) => leaf.detach());
	}

	async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX)[0];
		const leaf: WorkspaceLeaf = existing ?? this.app.workspace.getLeaf('tab');
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX, active: true });
		leaf.setEphemeralState({ focus: true });
	}

	async createTask(draft: TaskDraft): Promise<void> {
		const data = await this.store.load();
		const now = new Date().toISOString();
		data.tasks.push({
			...draft, id: crypto.randomUUID(), completed: false,
			order: data.tasks.filter((task) => task.quadrant === draft.quadrant).length,
			createdAt: now, updatedAt: now,
		});
		await this.store.save(data); await this.refreshViews();
	}

	async updateTask(id: string, patch: Partial<QuadrantTask> | TaskDraft): Promise<void> {
		const data = await this.store.load();
		const task = data.tasks.find((candidate) => candidate.id === id);
		if (!task) return;
		const wasCompleted = task.completed;
		Object.assign(task, patch, { updatedAt: new Date().toISOString() });
		if (!wasCompleted && task.completed) task.completedAt = new Date().toISOString();
		if (wasCompleted && !task.completed) delete task.completedAt;
		await this.store.save(data); await this.refreshViews();
	}

	async deleteTask(id: string): Promise<void> {
		const data = await this.store.load();
		data.tasks = data.tasks.filter((task) => task.id !== id);
		await this.store.save(data); await this.refreshViews();
	}

	async refreshViews(): Promise<void> {
		await Promise.all(this.app.workspace.getLeavesOfType(VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX).map((leaf) => (leaf.view as ObsidianEisenhowerMatrixView).reload()));
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<ObsidianEisenhowerMatrixSettings>);
	}
	async saveSettings(): Promise<void> { await this.saveData(this.settings); }
}
