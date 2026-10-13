import { TFile, Vault } from 'obsidian';
import { TaskStoreData } from '../types';

const EMPTY_STORE: TaskStoreData = { version: 1, tasks: [] };

export class TaskStore {
	private writeQueue = Promise.resolve();

	constructor(
		private readonly vault: Vault,
		private readonly getPath: () => string,
	) {}

	async load(): Promise<TaskStoreData> {
		const file = this.vault.getAbstractFileByPath(this.getPath());
		if (!(file instanceof TFile)) return structuredClone(EMPTY_STORE);

		try {
			const parsed: unknown = JSON.parse(await this.vault.read(file));
			if (this.isStoreData(parsed)) return parsed;
		} catch (error) {
			console.error('Obsidian Eisenhower Matrix: unable to read task data.', error);
		}
		return structuredClone(EMPTY_STORE);
	}

	async save(data: TaskStoreData): Promise<void> {
		this.writeQueue = this.writeQueue.then(() => this.writeNow(data));
		return this.writeQueue;
	}

	private async writeNow(data: TaskStoreData): Promise<void> {
		const path = this.getPath();
		const existing = this.vault.getAbstractFileByPath(path);
		const contents = JSON.stringify(data, null, 2);
		if (existing instanceof TFile) {
			await this.vault.modify(existing, contents);
			return;
		}

		const parent = path.split('/').slice(0, -1).join('/');
		if (parent) await this.vault.createFolder(parent).catch(() => undefined);
		await this.vault.create(path, contents);
	}

	private isStoreData(value: unknown): value is TaskStoreData {
		if (!value || typeof value !== 'object') return false;
		const candidate = value as Partial<TaskStoreData>;
		return candidate.version === 1 && Array.isArray(candidate.tasks);
	}
}
