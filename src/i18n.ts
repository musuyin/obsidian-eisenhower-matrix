import { Quadrant } from './types';

export type Language = 'en' | 'zh';
export type TranslationKey = keyof typeof EN;

const EN = {
	viewTitle: 'Eisenhower matrix',
	viewDescription: 'Choose the next action by urgency and importance.',
	showCompleted: 'Show completed',
	hideCompleted: 'Hide completed',
	quickCreatePlaceholder: 'Add a task, then fill in the details below',
	addTask: 'Add task',
	noTasks: 'No tasks yet',
	taskCollection: 'Task collection',
	taskDetails: 'Task details',
	selectTask: 'Select a task above to view and edit its details.',
	title: 'Title',
	quadrant: 'Category',
	description: 'Description',
	descriptionPlaceholder: 'Add context, notes, or a next step',
	dueDate: 'Due date',
	clearDueDate: 'Clear due date',
	doubleClickToAdd: 'Double-click to add a task',
	expandSubtasks: 'Show subtasks',
	collapseSubtasks: 'Hide subtasks',
	linkedNotes: 'Linked notes',
	addLinkedNote: 'Add linked note',
	notePathPlaceholder: 'Note path or [[internal link]]',
	subtasks: 'Subtasks',
	addSubtask: 'Add subtask',
	subtaskPlaceholder: 'Subtask',
	remove: 'Remove',
	saveChanges: 'Save changes',
	deleteTask: 'Delete task',
	completed: 'Completed',
	deleteTitle: 'Delete task?',
	deleteMessage: '“{title}” will be permanently removed.',
	cancel: 'Cancel',
	delete: 'Delete',
	noteNotFound: 'Linked note not found: {link}',
	dataFileName: 'Task data file',
	dataFileDesc: 'The JSON file path relative to the vault root. New tasks are saved at this location.',
	showCompletedName: 'Show completed tasks',
	showCompletedDesc: 'Show completed tasks in the matrix by default.',
	languageName: 'Language',
	languageDesc: 'Choose the language used by the plugin interface.',
	english: 'English',
	chinese: '中文',
};

const ZH: Record<TranslationKey, string> = {
	viewTitle: '任务四象限', viewDescription: '按重要性与紧急性安排下一步。',
	showCompleted: '显示已完成', hideCompleted: '隐藏已完成',
	quickCreatePlaceholder: '输入任务，稍后在下方补充详细信息', addTask: '添加任务', noTasks: '暂无任务',
	taskCollection: '任务集合', taskDetails: '任务详情', selectTask: '在上方选择一个任务以查看和编辑详情。',
	title: '任务名称', quadrant: '所属象限', description: '说明', descriptionPlaceholder: '添加背景、备注或下一步行动',
	dueDate: '截止日期', clearDueDate: '清除截止日期', doubleClickToAdd: '双击以添加任务',
	expandSubtasks: '显示子任务', collapseSubtasks: '收起子任务',
	linkedNotes: '关联笔记', addLinkedNote: '添加关联笔记', notePathPlaceholder: '笔记路径或 [[内部链接]]',
	subtasks: '子任务', addSubtask: '添加子任务', subtaskPlaceholder: '子任务', remove: '移除',
	saveChanges: '保存更改', deleteTask: '删除任务', completed: '已完成',
	deleteTitle: '删除任务？', deleteMessage: '“{title}”将被永久移除。', cancel: '取消', delete: '删除',
	noteNotFound: '未找到关联笔记：{link}',
	dataFileName: '任务数据文件', dataFileDesc: '相对于 Vault 根目录的 JSON 文件路径。新任务会保存到此位置。',
	showCompletedName: '显示已完成任务', showCompletedDesc: '默认在四象限中显示已完成的任务。',
	languageName: '语言', languageDesc: '选择插件界面使用的语言。', english: 'English', chinese: '中文',
};

const QUADRANT_TEXT: Record<Language, Record<Quadrant, string>> = {
	en: {
		'important-urgent': 'Do now',
		'important-not-urgent': 'Schedule',
		'not-important-urgent': 'Delegate',
		'not-important-not-urgent': 'Eliminate',
	},
	zh: {
		'important-urgent': '重要且紧急',
		'important-not-urgent': '重要但不紧急',
		'not-important-urgent': '紧急但不重要',
		'not-important-not-urgent': '不重要且不紧急',
	},
};

export function translate(language: Language, key: TranslationKey, values: Record<string, string> = {}): string {
	return (language === 'zh' ? ZH[key] : EN[key]).replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? '');
}

export function quadrantLabel(language: Language, quadrant: Quadrant): string {
	return QUADRANT_TEXT[language][quadrant];
}
