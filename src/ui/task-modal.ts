import { App, Modal } from 'obsidian';
import { Language, quadrantLabel, translate } from '../i18n';
import { Quadrant, QuadrantTask, QUADRANTS, Subtask, TaskLink } from '../types';

export interface TaskDraft {
	title: string;
	description: string;
	quadrant: Quadrant;
	links: TaskLink[];
	subtasks: Subtask[];
	dueDate?: string;
}

export class TaskEditor {
	private draft: TaskDraft;
	private readonly t: (key: Parameters<typeof translate>[1], values?: Record<string, string>) => string;

	constructor(
		private readonly container: HTMLElement,
		initial: TaskDraft,
		private readonly language: Language,
		private readonly onSave: (draft: TaskDraft) => Promise<void>,
		private readonly onDelete: () => void,
		private readonly onOpenLink: (path: string) => void,
		private readonly notePaths: string[],
	) {
		this.draft = structuredClone(initial);
		this.t = (key, values) => translate(language, key, values);
	}

	render(): void {
		const title = this.container.createEl('input', { cls: 'obsidian-eisenhower-matrix-detail-title', type: 'text', value: this.draft.title, placeholder: this.t('title') });
		title.addEventListener('input', () => { this.draft.title = title.value; });
		title.addEventListener('blur', () => this.persist());

		const fields = this.container.createDiv({ cls: 'obsidian-eisenhower-matrix-detail-fields' });
		const category = fields.createDiv({ cls: 'obsidian-eisenhower-matrix-detail-field' });
		category.createEl('label', { text: this.t('quadrant') });
		const select = category.createEl('select');
		QUADRANTS.forEach((quadrant) => select.createEl('option', { value: quadrant, text: quadrantLabel(this.language, quadrant) }));
		select.value = this.draft.quadrant;
		select.addEventListener('change', () => { this.draft.quadrant = select.value as Quadrant; this.persist(); });

		const dueDate = fields.createDiv({ cls: 'obsidian-eisenhower-matrix-detail-field obsidian-eisenhower-matrix-due-field' });
		dueDate.createEl('label', { text: this.t('dueDate') });
		const dueDateInput = dueDate.createEl('input', { type: 'datetime-local', value: this.draft.dueDate ?? '', attr: { step: '3600' } });
		const shortcuts = dueDate.createDiv({ cls: 'obsidian-eisenhower-matrix-date-shortcuts' });
		const clearDueDate = shortcuts.createEl('button', { text: this.t('nullDueDate'), cls: 'obsidian-eisenhower-matrix-date-shortcut', attr: { type: 'button' } });
		clearDueDate.addEventListener('mousedown', (event) => event.preventDefault());
		clearDueDate.addEventListener('click', () => {
			this.draft.dueDate = undefined;
			dueDateInput.value = '';
			this.persist();
		});
		const shortcutValues: Array<[Parameters<typeof translate>[1], () => Date]> = [
			['today', () => new Date()],
			['tomorrow', () => this.addDays(new Date(), 1)],
			['dayAfterTomorrow', () => this.addDays(new Date(), 2)],
			['nextWeek', () => this.addDays(new Date(), 7)],
			['nextMonth', () => this.addMonths(new Date(), 1)],
		];
		shortcutValues.forEach(([key, getDate]) => {
			const shortcut = shortcuts.createEl('button', { text: this.t(key), cls: 'obsidian-eisenhower-matrix-date-shortcut', attr: { type: 'button' } });
			shortcut.addEventListener('mousedown', (event) => event.preventDefault());
			shortcut.addEventListener('click', () => {
				this.draft.dueDate = this.formatLocalDate(getDate());
				dueDateInput.value = this.draft.dueDate;
				this.persist();
			});
		});
		const updateDueDateDraft = () => { this.draft.dueDate = this.normalizeDueDate(dueDateInput.value); };
		dueDateInput.addEventListener('input', updateDueDateDraft);
		dueDateInput.addEventListener('change', updateDueDateDraft);
		dueDateInput.addEventListener('blur', () => {
			updateDueDateDraft();
			this.persist();
		});

		const description = fields.createDiv({ cls: 'obsidian-eisenhower-matrix-detail-field obsidian-eisenhower-matrix-description-field' });
		description.createEl('label', { text: this.t('description') });
		const area = description.createEl('textarea', { text: this.draft.description, placeholder: this.t('descriptionPlaceholder'), attr: { rows: '1' } });
		const resizeArea = () => {
			area.setCssStyles({ height: 'auto' });
			area.setCssStyles({ height: `${area.scrollHeight}px` });
		};
		resizeArea();
		area.addEventListener('input', () => { this.draft.description = area.value; resizeArea(); });
		area.addEventListener('blur', () => this.persist());

		this.renderSubtasks();
		this.renderLinks();
		const actions = this.container.createDiv({ cls: 'obsidian-eisenhower-matrix-detail-actions' });
		const remove = actions.createEl('button', { text: this.t('deleteTask'), cls: 'mod-warning' });
		remove.addEventListener('click', this.onDelete);
	}

	private normalizeDueDate(value: string): string | undefined {
		if (!value) return undefined;
		const [date, time] = value.split('T');
		const hour = time?.slice(0, 2);
		return date && hour ? `${date}T${hour}:00` : undefined;
	}

	private addDays(date: Date, days: number): Date { date.setDate(date.getDate() + days); return date; }
	private addMonths(date: Date, months: number): Date {
		const day = date.getDate();
		date.setDate(1);
		date.setMonth(date.getMonth() + months);
		date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
		return date;
	}
	private formatLocalDate(date: Date): string {
		date.setMinutes(0, 0, 0);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00`;
	}

	private persist(): void {
		const title = this.draft.title.trim();
		if (!title) return;
		this.draft.title = title;
		this.draft.links = this.draft.links.filter((link) => link.path.trim()).map((link) => ({ ...link, path: link.path.trim() }));
		this.draft.subtasks = this.draft.subtasks
			.filter((subtask) => subtask.title.trim())
			.map((subtask, index) => ({ ...subtask, title: subtask.title.trim(), order: index }));
		void this.onSave(structuredClone(this.draft));
	}

	private renderLinks(): void {
		const group = this.container.createDiv({ cls: 'obsidian-eisenhower-matrix-detail-group' });
		group.createEl('h3', { text: this.t('linkedNotes') });
		const suggestionsId = `obsidian-eisenhower-matrix-notes-${crypto.randomUUID()}`;
		const suggestions = group.createEl('datalist', { attr: { id: suggestionsId } });
		this.notePaths.forEach((path) => suggestions.createEl('option', { value: path }));
		const rows = group.createDiv();
		const draw = () => {
			rows.empty();
			this.draft.links.forEach((link, index) => {
				const row = rows.createDiv({ cls: 'obsidian-eisenhower-matrix-modal-row' });
				const input = row.createEl('input', { type: 'text', value: link.path, placeholder: this.t('notePathPlaceholder'), attr: { list: suggestionsId } });
				input.addEventListener('input', () => { link.path = input.value; });
				input.addEventListener('blur', () => this.persist());
				const open = row.createEl('button', { text: '↗', attr: { 'aria-label': link.path } });
				open.addEventListener('click', () => this.onOpenLink(link.path));
				const remove = row.createEl('button', { text: this.t('remove'), cls: 'mod-warning' });
				remove.addEventListener('click', () => { this.draft.links.splice(index, 1); this.persist(); draw(); });
			});
		};
		draw();
		const add = group.createEl('button', { text: this.t('addLinkedNote'), cls: 'obsidian-eisenhower-matrix-secondary-button' });
		add.addEventListener('click', () => { this.draft.links.push({ path: '' }); draw(); });
	}

	private renderSubtasks(): void {
		const group = this.container.createDiv({ cls: 'obsidian-eisenhower-matrix-detail-group' });
		group.createEl('h3', { text: this.t('subtasks') });
		const rows = group.createDiv();
		const draw = () => {
			rows.empty();
			this.draft.subtasks.forEach((subtask, index) => {
				const row = rows.createDiv({ cls: 'obsidian-eisenhower-matrix-modal-row' });
				const checkbox = row.createEl('input', { type: 'checkbox' }); checkbox.checked = subtask.completed;
				checkbox.addEventListener('change', () => { subtask.completed = checkbox.checked; this.persist(); });
				const initialTitle = subtask.title;
				let settled = false;
				const input = row.createEl('input', { type: 'text', value: subtask.title, placeholder: this.t('subtaskPlaceholder') });
				input.addEventListener('input', () => { subtask.title = input.value; });
				input.addEventListener('keydown', (event) => {
					if (event.key !== 'Enter') return;
					event.preventDefault();
					settled = true;
					if (!input.value.trim()) {
						if (!initialTitle) this.draft.subtasks.splice(index, 1);
						else subtask.title = initialTitle;
						draw();
						this.persist();
						return;
					}
					subtask.title = input.value.trim();
					this.persist();
					this.draft.subtasks.splice(index + 1, 0, { id: crypto.randomUUID(), title: '', completed: false, order: index + 1 });
					draw();
					(rows.children[index + 1]?.querySelector('input[type="text"]') as HTMLInputElement | null)?.focus();
				});
				input.addEventListener('blur', () => {
					if (settled) return;
					settled = true;
					if (!input.value.trim()) {
						if (!initialTitle) this.draft.subtasks.splice(index, 1);
						else subtask.title = initialTitle;
						draw();
					}
					this.persist();
				});
				const remove = row.createEl('button', { text: this.t('remove'), cls: 'mod-warning' });
				remove.addEventListener('click', () => { this.draft.subtasks.splice(index, 1); this.persist(); draw(); });
			});
		};
		draw();
		const add = group.createEl('button', { text: this.t('addSubtask'), cls: 'obsidian-eisenhower-matrix-secondary-button' });
		add.addEventListener('click', () => {
			this.draft.subtasks.push({ id: crypto.randomUUID(), title: '', completed: false, order: this.draft.subtasks.length });
			draw();
			(rows.lastElementChild?.querySelector('input[type="text"]') as HTMLInputElement | null)?.focus();
		});
	}
}

export class ConfirmDeleteModal extends Modal {
	private readonly t: (key: Parameters<typeof translate>[1], values?: Record<string, string>) => string;
	constructor(app: App, private readonly task: QuadrantTask, language: Language, private readonly onConfirm: () => Promise<void>) { super(app); this.t = (key, values) => translate(language, key, values); }
	onOpen(): void {
		this.contentEl.createEl('h2', { text: this.t('deleteTitle') });
		this.contentEl.createEl('p', { text: this.t('deleteMessage', { title: this.task.title }) });
		const actions = this.contentEl.createDiv({ cls: 'modal-button-container' });
		actions.createEl('button', { text: this.t('cancel') }).addEventListener('click', () => this.close());
		actions.createEl('button', { text: this.t('delete'), cls: 'mod-warning' }).addEventListener('click', () => void this.onConfirm().then(() => this.close()));
	}
	onClose(): void { this.contentEl.empty(); }
}
