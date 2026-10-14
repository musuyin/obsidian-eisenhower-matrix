import { ItemView, Notice, setIcon, TFile, WorkspaceLeaf } from 'obsidian';
import { quadrantLabel, translate } from '../i18n';
import ObsidianEisenhowerMatrixPlugin from '../main';
import { Quadrant, QuadrantTask, QUADRANTS, Subtask } from '../types';
import { ConfirmDeleteModal, TaskEditor } from './task-modal';

export const VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX = 'obsidian-eisenhower-matrix-view';

export class ObsidianEisenhowerMatrixView extends ItemView {
	private tasks: QuadrantTask[] = [];
	private showCompleted = false;
	private selectedTaskId: string | null = null;
	private pendingCardSelection: number | null = null;
	private readonly expandedSubtaskTaskIds = new Set<string>();

	constructor(leaf: WorkspaceLeaf, private readonly plugin: ObsidianEisenhowerMatrixPlugin) { super(leaf); }

	getViewType(): string { return VIEW_TYPE_OBSIDIAN_EISENHOWER_MATRIX; }
	getDisplayText(): string { return translate(this.plugin.settings.language, 'viewTitle'); }
	getIcon(): string { return 'layout-grid'; }
	async onOpen(): Promise<void> { await this.reload(); }
	async onClose(): Promise<void> { this.clearPendingCardSelection(); this.contentEl.empty(); }
	async reload(): Promise<void> {
		this.tasks = (await this.plugin.store.load()).tasks;
		this.showCompleted = this.plugin.settings.showCompletedTasks;
		if (this.selectedTaskId && !this.tasks.some((task) => task.id === this.selectedTaskId)) this.selectedTaskId = null;
		this.render();
	}

	private get t() { return (key: Parameters<typeof translate>[1], values?: Record<string, string>) => translate(this.plugin.settings.language, key, values); }

	private render(): void {
		this.clearPendingCardSelection();
		const root = this.contentEl;
		root.empty(); root.addClass('obsidian-eisenhower-matrix-view');
		const header = root.createDiv({ cls: 'obsidian-eisenhower-matrix-header' });
		const title = header.createDiv();
		title.createEl('h1', { text: this.t('viewTitle') });
		title.createEl('p', { text: this.t('viewDescription') });

		const create = root.createDiv({ cls: 'obsidian-eisenhower-matrix-quick-create' });
		const input = create.createEl('input', { type: 'text', placeholder: this.t('quickCreatePlaceholder'), attr: { 'aria-label': this.t('quickCreatePlaceholder') } });
		const category = create.createEl('select', { attr: { 'aria-label': this.t('quadrant') } });
		QUADRANTS.forEach((quadrant) => category.createEl('option', { value: quadrant, text: quadrantLabel(this.plugin.settings.language, quadrant) }));
		const add = create.createEl('button', { text: this.t('addTask'), cls: 'mod-cta' });
		setIcon(add, 'plus'); add.appendText(` ${this.t('addTask')}`);
		const submit = () => { void this.plugin.createQuickTask(input.value, category.value as Quadrant).then(() => { input.value = ''; input.focus(); }); };
		add.addEventListener('click', submit);
		input.addEventListener('keydown', (event) => { if (event.key === 'Enter') submit(); });

		root.createEl('h2', { cls: 'obsidian-eisenhower-matrix-section-title', text: this.t('taskCollection') });
		const grid = root.createDiv({ cls: 'obsidian-eisenhower-matrix-grid' });
		QUADRANTS.forEach((quadrant) => this.renderQuadrant(grid, quadrant));
		this.renderCompletedTasks(root);
		this.renderDetails(root);
	}

	private renderQuadrant(grid: HTMLElement, quadrant: Quadrant): void {
		const panel = grid.createDiv({ cls: `obsidian-eisenhower-matrix-panel obsidian-eisenhower-matrix-${quadrant}` });
		const heading = panel.createDiv({ cls: 'obsidian-eisenhower-matrix-panel-heading' });
		heading.createEl('h3', { text: quadrantLabel(this.plugin.settings.language, quadrant) });
		const total = this.tasks.filter((task) => task.quadrant === quadrant && !task.completed).length;
		heading.createDiv({ cls: 'obsidian-eisenhower-matrix-panel-summary', text: this.t('taskCount', { total: String(total) }) });
		const list = panel.createDiv({ cls: 'obsidian-eisenhower-matrix-task-list' });
		list.addEventListener('dragover', (event) => {
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
			panel.addClass('is-drag-target');
		});
		list.addEventListener('dragleave', (event) => { if (!list.contains(event.relatedTarget as Node | null)) panel.removeClass('is-drag-target'); });
		list.addEventListener('drop', (event) => {
			event.preventDefault(); panel.removeClass('is-drag-target'); this.clearDropIndicators();
			const taskId = event.dataTransfer?.getData('text/plain');
			if (taskId) void this.plugin.moveTask(taskId, quadrant);
		});
		panel.addEventListener('dblclick', (event) => {
			const target = event.target;
			if (!(target instanceof HTMLElement) || target.closest('button, input, select, textarea, a, [contenteditable="true"]')) return;
			this.clearPendingCardSelection();
			this.renderInlineCreate(list, quadrant);
		});
		const tasks = this.tasks.filter((task) => task.quadrant === quadrant && !task.completed).sort((a, b) => a.order - b.order);
		if (!tasks.length) list.createDiv({ cls: 'obsidian-eisenhower-matrix-empty', text: this.t('doubleClickToAdd') });
		tasks.forEach((task) => this.renderTask(list, task));
	}

	private renderInlineCreate(list: HTMLElement, quadrant: Quadrant): void {
		if (list.querySelector('.obsidian-eisenhower-matrix-inline-create')) return;
		list.querySelector('.obsidian-eisenhower-matrix-empty')?.remove();
		const input = list.createEl('input', { cls: 'obsidian-eisenhower-matrix-inline-create', type: 'text', placeholder: this.t('quickCreatePlaceholder') });
		let submitted = false;
		const submit = () => {
			if (submitted) return;
			submitted = true;
			const title = input.value.trim();
			if (title) void this.plugin.createQuickTask(title, quadrant);
			else input.remove();
		};
		input.addEventListener('keydown', (event) => { if (event.key === 'Enter') submit(); if (event.key === 'Escape') input.remove(); });
		input.addEventListener('blur', submit);
		input.focus();
	}

	private renderTask(list: HTMLElement, task: QuadrantTask, draggable = true): void {
		const card = list.createDiv({ cls: `obsidian-eisenhower-matrix-task${task.completed ? ' is-completed' : ''}${task.id === this.selectedTaskId ? ' is-selected' : ''}` });
		if (draggable) {
			card.addEventListener('dragover', (event) => {
				event.preventDefault(); event.stopPropagation(); this.clearDropIndicators();
				card.addClass(event.clientY < card.getBoundingClientRect().top + card.offsetHeight / 2 ? 'is-drop-before' : 'is-drop-after');
			});
			card.addEventListener('drop', (event) => {
				event.preventDefault(); event.stopPropagation();
				const taskId = event.dataTransfer?.getData('text/plain');
				const dropAfter = card.hasClass('is-drop-after'); this.clearDropIndicators();
				if (!taskId || taskId === task.id) return;
				const ordered = this.tasks.filter((item) => item.quadrant === task.quadrant && !item.completed && item.id !== taskId).sort((a, b) => a.order - b.order);
				const index = ordered.findIndex((item) => item.id === task.id);
				const beforeTaskId = dropAfter ? ordered[index + 1]?.id : task.id;
				void this.plugin.moveTask(taskId, task.quadrant, beforeTaskId);
			});
		}
		const top = card.createDiv({ cls: 'obsidian-eisenhower-matrix-task-top' });
		if (draggable) {
			const handle = top.createEl('button', { cls: 'obsidian-eisenhower-matrix-drag-handle', attr: { draggable: 'true', 'aria-label': this.t('dragTask') } });
			setIcon(handle, 'grip-vertical');
			handle.addEventListener('click', (event) => event.stopPropagation());
			handle.addEventListener('dragstart', (event) => {
				event.stopPropagation(); card.addClass('is-dragging'); event.dataTransfer?.setData('text/plain', task.id);
				if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
			});
			handle.addEventListener('dragend', () => { card.removeClass('is-dragging'); this.clearDropIndicators(); });
		}
		const checkbox = top.createEl('input', { type: 'checkbox', attr: { 'aria-label': this.t('completed') } });
		checkbox.checked = task.completed;
		checkbox.addEventListener('click', (event) => event.stopPropagation());
		checkbox.addEventListener('change', () => void this.plugin.updateTask(task.id, { completed: checkbox.checked }));
		const taskTitle = top.createEl('button', { text: task.title, cls: 'obsidian-eisenhower-matrix-task-title' });
		taskTitle.addEventListener('click', (event) => { event.stopPropagation(); this.selectedTaskId = task.id; this.replaceTaskTitle(taskTitle, task); });
		const details = top.createEl('button', { cls: 'obsidian-eisenhower-matrix-details-toggle', attr: { 'aria-label': this.t('taskDetails') } });
		setIcon(details, 'info');
		details.addEventListener('click', (event) => { event.stopPropagation(); this.selectedTaskId = task.id; this.render(); });
		card.addEventListener('click', (event) => {
			if (event.detail > 1) { this.clearPendingCardSelection(); return; }
			this.clearPendingCardSelection();
			this.pendingCardSelection = window.setTimeout(() => {
				this.pendingCardSelection = null;
				this.selectedTaskId = task.id;
				this.render();
			}, 400);
		});
		card.addEventListener('dblclick', () => this.clearPendingCardSelection());
		if (task.dueDate) card.createDiv({ cls: 'obsidian-eisenhower-matrix-task-due-date', text: this.t('dueDateInCollection', { date: this.formatDueDate(task.dueDate) }) });
		if (task.subtasks.length) {
			const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
			card.createDiv({ cls: 'obsidian-eisenhower-matrix-task-progress', text: this.t('subtaskProgress', { completed: String(completedSubtasks), total: String(task.subtasks.length) }) });

			const toggle = top.createEl('button', { cls: 'obsidian-eisenhower-matrix-subtask-toggle', attr: { 'aria-label': this.expandedSubtaskTaskIds.has(task.id) ? this.t('collapseSubtasks') : this.t('expandSubtasks') } });
			setIcon(toggle, this.expandedSubtaskTaskIds.has(task.id) ? 'chevron-up' : 'chevron-down');
			toggle.addEventListener('click', (event) => { event.stopPropagation(); if (this.expandedSubtaskTaskIds.has(task.id)) this.expandedSubtaskTaskIds.delete(task.id); else this.expandedSubtaskTaskIds.add(task.id); this.render(); });
			if (this.expandedSubtaskTaskIds.has(task.id)) {
				const subtasks = card.createDiv({ cls: 'obsidian-eisenhower-matrix-subtasks' });
				[...task.subtasks].sort((a, b) => a.order - b.order).forEach((subtask) => this.renderSubtask(subtasks, task, subtask));
			}
		}
	}

	private replaceTaskTitle(button: HTMLButtonElement, task: QuadrantTask): void {
		const input = button.parentElement?.createEl('input', { cls: 'obsidian-eisenhower-matrix-inline-title', type: 'text', value: task.title });
		if (!input) return;
		button.parentElement?.insertBefore(input, button);
		button.hide(); input.focus(); input.setSelectionRange(0, input.value.length);
		let settled = false;
		const save = () => {
			if (settled) return; settled = true;
			const title = input.value.trim(); input.remove(); button.show();
			if (title && title !== task.title) void this.plugin.updateTask(task.id, { title });
		};
		input.addEventListener('click', (event) => event.stopPropagation());
		input.addEventListener('keydown', (event) => { if (event.key === 'Enter') input.blur(); if (event.key === 'Escape') { settled = true; input.remove(); button.show(); } });
		input.addEventListener('blur', save);
	}

	private renderSubtask(container: HTMLElement, task: QuadrantTask, subtask: Subtask): void {
		const row = container.createDiv({ cls: `obsidian-eisenhower-matrix-subtask${subtask.completed ? ' is-completed' : ''}` });
		const checkbox = row.createEl('input', { type: 'checkbox', attr: { 'aria-label': subtask.title } });
		checkbox.checked = subtask.completed;
		checkbox.addEventListener('click', (event) => event.stopPropagation());
		checkbox.addEventListener('change', () => this.updateSubtask(task, subtask.id, { completed: checkbox.checked }));
		const title = row.createEl('button', { text: subtask.title, cls: 'obsidian-eisenhower-matrix-subtask-title' });
		title.addEventListener('click', (event) => { event.stopPropagation(); this.replaceSubtaskTitle(title, task, subtask); });
	}

	private replaceSubtaskTitle(button: HTMLButtonElement, task: QuadrantTask, subtask: Subtask): void {
		const input = button.parentElement?.createEl('input', { cls: 'obsidian-eisenhower-matrix-inline-title', type: 'text', value: subtask.title });
		if (!input) return;
		button.parentElement?.insertBefore(input, button);
		button.hide(); input.focus(); input.setSelectionRange(0, input.value.length);
		let settled = false;
		const save = () => {
			if (settled) return; settled = true;
			const title = input.value.trim(); input.remove(); button.show();
			if (title && title !== subtask.title) this.updateSubtask(task, subtask.id, { title });
		};
		input.addEventListener('click', (event) => event.stopPropagation());
		input.addEventListener('keydown', (event) => { if (event.key === 'Enter') input.blur(); if (event.key === 'Escape') { settled = true; input.remove(); button.show(); } });
		input.addEventListener('blur', save);
	}

	private formatDueDate(dueDate: string): string {
		const [date = '', time = ''] = dueDate.split('T');
		const [year, month, day] = date.split('-');
		const hour = time.slice(0, 2);
		return this.plugin.settings.language === 'zh' ? `${year}-${month}-${day} ${hour}:00` : `${month}/${day}/${year} ${hour}:00`;
	}

	private updateSubtask(task: QuadrantTask, subtaskId: string, patch: Partial<Subtask>): void {
		void this.plugin.updateTask(task.id, { subtasks: task.subtasks.map((item) => item.id === subtaskId ? { ...item, ...patch } : item) });
	}

	private renderCompletedTasks(root: HTMLElement): void {
		const tasks = this.tasks.filter((task) => task.completed).sort((left, right) => (right.completedAt ?? '').localeCompare(left.completedAt ?? ''));
		const section = root.createDiv({ cls: `obsidian-eisenhower-matrix-completed${this.showCompleted ? ' is-expanded' : ''}` });
		const toggle = section.createEl('button', { cls: 'obsidian-eisenhower-matrix-completed-toggle', attr: { 'aria-expanded': String(this.showCompleted) } });
		setIcon(toggle, this.showCompleted ? 'chevron-down' : 'chevron-right');
		toggle.createSpan({ text: this.t('completedTasks') });
		toggle.createSpan({ cls: 'obsidian-eisenhower-matrix-completed-count', text: String(tasks.length) });
		toggle.addEventListener('click', () => void this.plugin.setShowCompletedTasks(!this.showCompleted));
		if (!this.showCompleted) return;
		const list = section.createDiv({ cls: 'obsidian-eisenhower-matrix-completed-list' });
		if (!tasks.length) list.createDiv({ cls: 'obsidian-eisenhower-matrix-empty', text: this.t('noCompletedTasks') });
		tasks.forEach((task) => this.renderTask(list, task, false));
	}

	private clearDropIndicators(): void {
		this.contentEl.querySelectorAll('.is-drop-before, .is-drop-after, .is-drag-target').forEach((element) => element.removeClass('is-drop-before', 'is-drop-after', 'is-drag-target'));
	}

	private clearPendingCardSelection(): void {
		if (this.pendingCardSelection === null) return;
		window.clearTimeout(this.pendingCardSelection);
		this.pendingCardSelection = null;
	}

	private renderDetails(root: HTMLElement): void {
		const section = root.createDiv({ cls: 'obsidian-eisenhower-matrix-details' });
		section.createEl('h2', { cls: 'obsidian-eisenhower-matrix-section-title', text: this.t('taskDetails') });
		const selected = this.tasks.find((task) => task.id === this.selectedTaskId);
		if (!selected) { section.createDiv({ cls: 'obsidian-eisenhower-matrix-empty', text: this.t('selectTask') }); return; }
		const notePaths = this.plugin.app.vault.getMarkdownFiles().map((file) => file.path).sort((a, b) => a.localeCompare(b));
		new TaskEditor(section, selected, this.plugin.settings.language, async (draft) => this.plugin.updateTask(selected.id, draft), () => this.confirmDelete(selected), (path) => this.openLinkedFile(path), notePaths).render();
	}

	private openLinkedFile(linkText: string): void {
		const rawLink = linkText.replace(/^\[\[|\]\]$/g, '');
		const parsed = rawLink.split('|')[0]?.split('#')[0] ?? rawLink;
		const file = this.plugin.app.metadataCache.getFirstLinkpathDest(parsed, '');
		if (file instanceof TFile) void this.plugin.app.workspace.getLeaf(true).openFile(file);
		else new Notice(this.t('noteNotFound', { link: linkText }));
	}
	private confirmDelete(task: QuadrantTask): void { new ConfirmDeleteModal(this.app, task, this.plugin.settings.language, async () => this.plugin.deleteTask(task.id)).open(); }
}
