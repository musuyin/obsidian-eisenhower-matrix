import { ItemView, Notice, setIcon, TFile, WorkspaceLeaf } from 'obsidian';
import TaskQuadrantPlugin from '../main';
import { Quadrant, QuadrantTask, QUADRANTS, QUADRANT_LABELS } from '../types';
import { ConfirmDeleteModal, TaskDraft, TaskModal } from './task-modal';

export const VIEW_TYPE_TASK_QUADRANT = 'task-quadrant-view';

export class TaskQuadrantView extends ItemView {
	private tasks: QuadrantTask[] = [];
	private showCompleted = false;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: TaskQuadrantPlugin) { super(leaf); }

	getViewType(): string { return VIEW_TYPE_TASK_QUADRANT; }
	getDisplayText(): string { return '任务四象限'; }
	getIcon(): string { return 'layout-grid'; }

	async onOpen(): Promise<void> { await this.reload(); }
	async onClose(): Promise<void> { this.contentEl.empty(); }
	async reload(): Promise<void> { this.tasks = (await this.plugin.store.load()).tasks; this.showCompleted = this.plugin.settings.showCompletedTasks; this.render(); }

	private render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass('task-quadrant-view');
		const header = root.createDiv({ cls: 'task-quadrant-header' });
		const title = header.createDiv();
		title.createEl('h1', { text: '任务四象限' });
		title.createEl('p', { text: '按重要性与紧急性安排下一步。' });
		const actions = header.createDiv({ cls: 'task-quadrant-actions' });
		const completedButton = actions.createEl('button', { text: this.showCompleted ? '隐藏已完成' : '显示已完成' });
		completedButton.addEventListener('click', () => { this.showCompleted = !this.showCompleted; this.render(); });
		const addButton = actions.createEl('button', { text: '新增任务', cls: 'mod-cta' });
		setIcon(addButton, 'plus');
		addButton.appendText(' 新增任务');
		addButton.addEventListener('click', () => this.openCreateModal('important-urgent'));

		const axes = root.createDiv({ cls: 'task-quadrant-axes' });
		axes.createDiv({ text: '↑ 重要', cls: 'task-quadrant-importance-label' });
		axes.createDiv({ text: '紧急 ←　　　　　　　　→ 不紧急', cls: 'task-quadrant-urgency-label' });
		const grid = root.createDiv({ cls: 'task-quadrant-grid' });
		QUADRANTS.forEach((quadrant) => this.renderQuadrant(grid, quadrant));
	}

	private renderQuadrant(grid: HTMLElement, quadrant: Quadrant): void {
		const panel = grid.createDiv({ cls: `task-quadrant-panel task-quadrant-${quadrant}` });
		const heading = panel.createDiv({ cls: 'task-quadrant-panel-heading' });
		heading.createEl('h2', { text: QUADRANT_LABELS[quadrant] });
		const plus = heading.createEl('button', { attr: { 'aria-label': `在${QUADRANT_LABELS[quadrant]}中新增任务` } });
		setIcon(plus, 'plus');
		plus.addEventListener('click', () => this.openCreateModal(quadrant));
		const list = panel.createDiv({ cls: 'task-quadrant-task-list' });
		const tasks = this.tasks.filter((task) => task.quadrant === quadrant && (this.showCompleted || !task.completed)).sort((a, b) => a.order - b.order);
		if (!tasks.length) list.createDiv({ cls: 'task-quadrant-empty', text: '暂无任务' });
		tasks.forEach((task) => this.renderTask(list, task));
	}

	private renderTask(list: HTMLElement, task: QuadrantTask): void {
		const card = list.createDiv({ cls: `task-quadrant-task${task.completed ? ' is-completed' : ''}` });
		const top = card.createDiv({ cls: 'task-quadrant-task-top' });
		const checkbox = top.createEl('input', { type: 'checkbox' });
		checkbox.checked = task.completed;
		checkbox.addEventListener('change', () => void this.plugin.updateTask(task.id, { completed: checkbox.checked }));
		const taskTitle = top.createEl('button', { text: task.title, cls: 'task-quadrant-task-title' });
		taskTitle.addEventListener('click', () => this.openEditModal(task));
		const menu = top.createEl('button', { attr: { 'aria-label': `编辑${task.title}` } });
		setIcon(menu, 'pencil');
		menu.addEventListener('click', () => this.openEditModal(task));
		if (task.description) card.createDiv({ cls: 'task-quadrant-description', text: task.description });
		if (task.subtasks.length) {
			const progress = task.subtasks.filter((item) => item.completed).length;
			card.createDiv({ cls: 'task-quadrant-subtask-count', text: `${progress}/${task.subtasks.length} 个子任务` });
		}
		if (task.links.length) {
			const links = card.createDiv({ cls: 'task-quadrant-links' });
			task.links.forEach((link) => {
				const button = links.createEl('button', { text: link.alias || link.path });
				setIcon(button, 'file-text'); button.appendText(` ${link.alias || link.path}`);
				button.addEventListener('click', () => this.openLinkedFile(link.path));
			});
		}
	}

	private openLinkedFile(linkText: string): void {
		const rawLink = linkText.replace(/^\[\[|\]\]$/g, '');
		const parsed = rawLink.split('|')[0]?.split('#')[0] ?? rawLink;
		const file = this.plugin.app.metadataCache.getFirstLinkpathDest(parsed, '');
		if (file instanceof TFile) void this.plugin.app.workspace.getLeaf(true).openFile(file);
		else new Notice(`未找到关联笔记：${linkText}`);
	}

	private openCreateModal(quadrant: Quadrant): void {
		const draft: TaskDraft = { title: '', description: '', quadrant, links: [], subtasks: [] };
		new TaskModal(this.app, draft, async (result) => this.plugin.createTask(result)).open();
	}

	private openEditModal(task: QuadrantTask): void {
		new TaskModal(
			this.app,
			task,
			async (result) => this.plugin.updateTask(task.id, result),
			() => this.confirmDelete(task),
		).open();
	}

	confirmDelete(task: QuadrantTask): void { new ConfirmDeleteModal(this.app, task, async () => this.plugin.deleteTask(task.id)).open(); }
}
