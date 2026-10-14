export type Quadrant =
	| 'important-urgent'
	| 'important-not-urgent'
	| 'not-important-urgent'
	| 'not-important-not-urgent';

export interface TaskLink {
	path: string;
	subpath?: string;
	alias?: string;
}

export interface Subtask {
	id: string;
	title: string;
	completed: boolean;
	order: number;
}

export interface QuadrantTask {
	id: string;
	title: string;
	description: string;
	quadrant: Quadrant;
	completed: boolean;
	order: number;
	links: TaskLink[];
	subtasks: Subtask[];
	createdAt: string;
	updatedAt: string;
	dueDate?: string;
	completedAt?: string;
}

export interface TaskStoreData {
	version: 1;
	tasks: QuadrantTask[];
}

export const QUADRANTS: readonly Quadrant[] = [
	'important-urgent',
	'important-not-urgent',
	'not-important-urgent',
	'not-important-not-urgent',
];

export const QUADRANT_LABELS: Record<Quadrant, string> = {
	'important-urgent': '重要且紧急',
	'important-not-urgent': '重要但不紧急',
	'not-important-urgent': '紧急但不重要',
	'not-important-not-urgent': '不重要且不紧急',
};
