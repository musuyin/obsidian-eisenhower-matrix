import { TFile, Vault } from 'obsidian';
import { Quadrant, QuadrantTask, QUADRANTS, Subtask, TaskLink, TaskStoreData } from '../types';

const EMPTY_STORE: TaskStoreData = { version: 1, tasks: [] };

export class TaskStore {
	private writeQueue = Promise.resolve();

	constructor(
		private readonly vault: Vault,
		private readonly getPath: () => string,
	) {}

	async load(): Promise<TaskStoreData> {
		const active = await this.readFile(this.getPath());
		const completed = await this.readFile(this.getCompletedPath());
		return { version: 1, tasks: [...active.tasks, ...completed.tasks] };
	}

	getCompletedPath(): string {
		const path = this.getPath();
		return path.toLowerCase().endsWith('.json') ? `${path.slice(0, -5)}-completed.json` : `${path}-completed.json`;
	}

	async save(data: TaskStoreData): Promise<void> {
		const snapshot = structuredClone(data);
		this.writeQueue = this.writeQueue.then(async () => {
			await this.writeNow(this.getPath(), { version: 1, tasks: snapshot.tasks.filter((task) => !task.completed) });
			await this.writeNow(this.getCompletedPath(), { version: 1, tasks: snapshot.tasks.filter((task) => task.completed) });
		});
		return this.writeQueue;
	}

	private async readFile(path: string): Promise<TaskStoreData> {
		const file = this.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return structuredClone(EMPTY_STORE);
		const parsed: unknown = JSON.parse(await this.vault.read(file));
		if (!this.isStoreData(parsed)) throw new Error(`Obsidian Eisenhower Matrix: invalid task data in ${path}.`);
		return parsed;
	}

	private async writeNow(path: string, data: TaskStoreData): Promise<void> {
		const existing = this.vault.getAbstractFileByPath(path);
		const contents = JSON.stringify(data, null, 2);
		if (existing instanceof TFile) {
			await this.vault.modify(existing, contents);
			return;
		}

		const parent = path.split('/').slice(0, -1).join('/');
		if (parent && !this.vault.getAbstractFileByPath(parent)) await this.vault.createFolder(parent);
		await this.vault.create(path, contents);
	}

	private isStoreData(value: unknown): value is TaskStoreData {
		if (!value || typeof value !== 'object') return false;
		const candidate = value as Partial<TaskStoreData>;
		return candidate.version === 1 && Array.isArray(candidate.tasks) && candidate.tasks.every((task) => this.isTask(task));
	}

	private isTask(value: unknown): value is QuadrantTask {
		if (!value || typeof value !== 'object') return false;
		const task = value as Partial<QuadrantTask>;
		return typeof task.id === 'string'
			&& typeof task.title === 'string'
			&& typeof task.description === 'string'
			&& this.isQuadrant(task.quadrant)
			&& typeof task.completed === 'boolean'
			&& typeof task.order === 'number'
			&& Array.isArray(task.links) && task.links.every((link) => this.isLink(link))
			&& Array.isArray(task.subtasks) && task.subtasks.every((subtask) => this.isSubtask(subtask))
			&& typeof task.createdAt === 'string'
			&& typeof task.updatedAt === 'string'
			&& (task.dueDate === undefined || typeof task.dueDate === 'string')
			&& (task.completedAt === undefined || typeof task.completedAt === 'string');
	}

	private isQuadrant(value: unknown): value is Quadrant { return typeof value === 'string' && QUADRANTS.includes(value as Quadrant); }
	private isLink(value: unknown): value is TaskLink {
		if (!value || typeof value !== 'object') return false;
		const link = value as Partial<TaskLink>;
		return typeof link.path === 'string'
			&& (link.subpath === undefined || typeof link.subpath === 'string')
			&& (link.alias === undefined || typeof link.alias === 'string');
	}
	private isSubtask(value: unknown): value is Subtask {
		if (!value || typeof value !== 'object') return false;
		const subtask = value as Partial<Subtask>;
		return typeof subtask.id === 'string' && typeof subtask.title === 'string' && typeof subtask.completed === 'boolean' && typeof subtask.order === 'number';
	}
}
