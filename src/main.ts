import { Plugin, WorkspaceLeaf } from 'obsidian';
import { TaskStore } from './data/task-store';
import { DEFAULT_SETTINGS, ObsidianEisenhowerMatrixSettings, ObsidianEisenhowerMatrixSettingTab } from './settings';
import { Quadrant, QuadrantTask } from './types';
import { TaskDraft } from './ui/task-modal';
import { translate } from './i18n';
import { ObsidianEisenhowerMatrixView, VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX } from './ui/quadrant-view';

export default class ObsidianEisenhowerMatrixPlugin extends Plugin {
	settings!: ObsidianEisenhowerMatrixSettings;
	store!: TaskStore;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.store = new TaskStore(this.app.vault, () => this.settings.dataFilePath);
		this.registerView(VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX, (leaf) => new ObsidianEisenhowerMatrixView(leaf, this));
		this.addRibbonIcon('layout-grid', translate(this.settings.language, 'viewTitle'), () => void this.activateView());
		this.addCommand({ id: 'open', name: translate(this.settings.language, 'viewTitle'), callback: () => void this.activateView() });
		this.addSettingTab(new ObsidianEisenhowerMatrixSettingTab(this.app, this));
		this.registerEvent(this.app.vault.on('modify', (file) => {
			if (file.path === this.settings.dataFilePath || file.path === this.store.getCompletedPath()) void this.refreshViews();
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

	async createQuickTask(title: string, quadrant: Quadrant): Promise<void> {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) return;
		await this.createTask({ title: trimmedTitle, description: '', quadrant, links: [], subtasks: [] });
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

	async moveTask(id: string, quadrant: Quadrant, beforeTaskId?: string): Promise<void> {
		const data = await this.store.load();
		const task = data.tasks.find((candidate) => candidate.id === id);
		if (!task) return;
		const sourceQuadrant = task.quadrant;
		const remaining = data.tasks.filter((candidate) => candidate.id !== id);
		const destination = remaining.filter((candidate) => candidate.quadrant === quadrant).sort((a, b) => a.order - b.order);
		const beforeIndex = beforeTaskId ? destination.findIndex((candidate) => candidate.id === beforeTaskId) : -1;
		task.quadrant = quadrant;
		destination.splice(beforeIndex >= 0 ? beforeIndex : destination.length, 0, task);
		data.tasks = [...remaining.filter((candidate) => candidate.quadrant !== quadrant), ...destination];
		for (const currentQuadrant of new Set([sourceQuadrant, quadrant])) {
			const ordered = currentQuadrant === quadrant
				? destination
				: data.tasks.filter((candidate) => candidate.quadrant === currentQuadrant).sort((a, b) => a.order - b.order);
			ordered.forEach((candidate, order) => { candidate.order = order; candidate.updatedAt = new Date().toISOString(); });
		}
		await this.store.save(data); await this.refreshViews();
	}

	async updateTask(id: string, patch: Partial<QuadrantTask> | TaskDraft): Promise<void> {
		const data = await this.store.load();
		const task = data.tasks.find((candidate) => candidate.id === id);
		if (!task) return;
		const wasCompleted = task.completed;
		const originalQuadrant = task.quadrant;
		Object.assign(task, patch, { updatedAt: new Date().toISOString() });
		if (!wasCompleted && task.completed) task.completedAt = new Date().toISOString();
		if (wasCompleted && !task.completed) delete task.completedAt;
		if (originalQuadrant !== task.quadrant) {
			task.order = data.tasks.filter((candidate) => candidate.id !== task.id && candidate.quadrant === task.quadrant).length;
			this.normalizeOrders(data.tasks, originalQuadrant, task.quadrant);
		}
		await this.store.save(data); await this.refreshViews();
	}

	async deleteTask(id: string): Promise<void> {
		const data = await this.store.load();
		const task = data.tasks.find((candidate) => candidate.id === id);
		data.tasks = data.tasks.filter((task) => task.id !== id);
		if (task) this.normalizeOrders(data.tasks, task.quadrant);
		await this.store.save(data); await this.refreshViews();
	}

	async setShowCompletedTasks(value: boolean): Promise<void> {
		this.settings.showCompletedTasks = value;
		await this.saveSettings();
		await this.refreshViews();
	}

	private normalizeOrders(tasks: QuadrantTask[], ...quadrants: Quadrant[]): void {
		for (const quadrant of new Set(quadrants)) {
			tasks.filter((task) => task.quadrant === quadrant).sort((left, right) => left.order - right.order).forEach((task, order) => { task.order = order; });
		}
	}

	async refreshViews(): Promise<void> {
		await Promise.all(this.app.workspace.getLeavesOfType(VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX).map((leaf) => (leaf.view as ObsidianEisenhowerMatrixView).reload()));
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<ObsidianEisenhowerMatrixSettings>);
	}
	async saveSettings(): Promise<void> { await this.saveData(this.settings); }
}
