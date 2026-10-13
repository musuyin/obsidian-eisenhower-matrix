import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TaskStore } from './data/task-store';
import { DEFAULT_SETTINGS, TaskQuadrantSettings, TaskQuadrantSettingTab } from './settings';
import { QuadrantTask } from './types';
import { TaskDraft } from './ui/task-modal';
import { TaskQuadrantView, VIEW_TYPE_TASK_QUADRANT } from './ui/quadrant-view';

export default class TaskQuadrantPlugin extends Plugin {
	settings!: TaskQuadrantSettings;
	store!: TaskStore;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.store = new TaskStore(this.app.vault, () => this.settings.dataFilePath);
		this.registerView(VIEW_TYPE_TASK_QUADRANT, (leaf) => new TaskQuadrantView(leaf, this));
		this.addRibbonIcon('layout-grid', '打开任务四象限', () => void this.activateView());
		this.addCommand({ id: 'open', name: '打开任务四象限', callback: () => void this.activateView() });
		this.addSettingTab(new TaskQuadrantSettingTab(this.app, this));
		this.registerEvent(this.app.vault.on('modify', (file) => {
			if (file.path === this.settings.dataFilePath) void this.refreshViews();
		}));
		this.registerDomEvent(window, 'resize', () => void this.refreshViews());
	}

	onunload(): void {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_QUADRANT).forEach((leaf) => leaf.detach());
	}

	async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_QUADRANT)[0];
		const leaf: WorkspaceLeaf = existing ?? this.app.workspace.getLeaf('tab');
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_TASK_QUADRANT, active: true });
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
		await Promise.all(this.app.workspace.getLeavesOfType(VIEW_TYPE_TASK_QUADRANT).map((leaf) => (leaf.view as TaskQuadrantView).reload()));
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<TaskQuadrantSettings>);
	}
	async saveSettings(): Promise<void> { await this.saveData(this.settings); }
}
