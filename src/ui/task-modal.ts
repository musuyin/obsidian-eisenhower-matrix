import { App, Modal, Setting } from 'obsidian';
import { Quadrant, QuadrantTask, QUADRANTS, QUADRANT_LABELS, Subtask, TaskLink } from '../types';

export interface TaskDraft {
	title: string;
	description: string;
	quadrant: Quadrant;
	links: TaskLink[];
	subtasks: Subtask[];
}

export class TaskModal extends Modal {
	private draft: TaskDraft;

	constructor(
		app: App,
		initial: TaskDraft,
		private readonly onSave: (draft: TaskDraft) => Promise<void>,
		private readonly onDelete?: () => void,
	) {
		super(app);
		this.draft = structuredClone(initial);
	}

	onOpen(): void {
		this.contentEl.addClass('obsidian-eisenhower-matrix-modal');
		this.contentEl.createEl('h2', { text: this.draft.title ? '编辑任务' : '新增任务' });
		new Setting(this.contentEl).setName('任务名称').addText((text) => {
			text.setValue(this.draft.title).setPlaceholder('要完成什么？').onChange((value) => { this.draft.title = value; });
		});
		new Setting(this.contentEl).setName('所属象限').addDropdown((dropdown) => {
			QUADRANTS.forEach((quadrant) => { dropdown.addOption(quadrant, QUADRANT_LABELS[quadrant]); });
			dropdown.setValue(this.draft.quadrant).onChange((value) => (this.draft.quadrant = value as Quadrant));
		});
		new Setting(this.contentEl).setName('说明').addTextArea((area) =>
			area.setValue(this.draft.description).setPlaceholder('可选的任务说明').onChange((value) => (this.draft.description = value)),
		);

		this.contentEl.createEl('h3', { text: '关联笔记' });
		const linksEl = this.contentEl.createDiv();
		const drawLinks = () => {
			linksEl.empty();
			this.draft.links.forEach((link, index) => {
				const row = linksEl.createDiv({ cls: 'obsidian-eisenhower-matrix-modal-row' });
				const input = row.createEl('input', { type: 'text', value: link.path, placeholder: '笔记路径或 [[内部链接]]' });
				input.addEventListener('change', () => (link.path = input.value.trim()));
				const remove = row.createEl('button', { text: '移除', cls: 'mod-warning' });
				remove.addEventListener('click', () => { this.draft.links.splice(index, 1); drawLinks(); });
			});
		};
		drawLinks();
		const addLink = this.contentEl.createEl('button', { text: '添加关联笔记', cls: 'obsidian-eisenhower-matrix-secondary-button' });
		addLink.addEventListener('click', () => { this.draft.links.push({ path: '' }); drawLinks(); });

		this.contentEl.createEl('h3', { text: '子任务' });
		const subtasksEl = this.contentEl.createDiv();
		const drawSubtasks = () => {
			subtasksEl.empty();
			this.draft.subtasks.forEach((subtask, index) => {
				const row = subtasksEl.createDiv({ cls: 'obsidian-eisenhower-matrix-modal-row' });
				const input = row.createEl('input', { type: 'text', value: subtask.title, placeholder: '子任务' });
				input.addEventListener('change', () => (subtask.title = input.value.trim()));
				const remove = row.createEl('button', { text: '移除', cls: 'mod-warning' });
				remove.addEventListener('click', () => { this.draft.subtasks.splice(index, 1); drawSubtasks(); });
			});
		};
		drawSubtasks();
		const addSubtask = this.contentEl.createEl('button', { text: '添加子任务', cls: 'obsidian-eisenhower-matrix-secondary-button' });
		addSubtask.addEventListener('click', () => { this.draft.subtasks.push({ id: crypto.randomUUID(), title: '', completed: false, order: this.draft.subtasks.length }); drawSubtasks(); });

		const actions = this.contentEl.createDiv({ cls: 'modal-button-container' });
		if (this.onDelete) {
			const remove = actions.createEl('button', { text: '删除', cls: 'mod-warning' });
			remove.addEventListener('click', () => { this.close(); this.onDelete?.(); });
		}
		const cancel = actions.createEl('button', { text: '取消' });
		cancel.addEventListener('click', () => this.close());
		const save = actions.createEl('button', { text: '保存', cls: 'mod-cta' });
		save.addEventListener('click', () => {
			this.draft.links = this.draft.links.filter((link) => link.path);
			this.draft.subtasks = this.draft.subtasks.filter((subtask) => subtask.title).map((subtask, index) => ({ ...subtask, order: index }));
			if (!this.draft.title.trim()) return;
			void this.onSave(this.draft).then(() => this.close());
		});
	}

	onClose(): void { this.contentEl.empty(); }
}

export class ConfirmDeleteModal extends Modal {
	constructor(app: App, private readonly task: QuadrantTask, private readonly onConfirm: () => Promise<void>) { super(app); }
	onOpen(): void {
		this.contentEl.createEl('h2', { text: '删除任务？' });
		this.contentEl.createEl('p', { text: `“${this.task.title}”将被永久移除。` });
		const actions = this.contentEl.createDiv({ cls: 'modal-button-container' });
		actions.createEl('button', { text: '取消' }).addEventListener('click', () => this.close());
		actions.createEl('button', { text: '删除', cls: 'mod-warning' }).addEventListener('click', () => void this.onConfirm().then(() => this.close()));
	}
	onClose(): void { this.contentEl.empty(); }
}
