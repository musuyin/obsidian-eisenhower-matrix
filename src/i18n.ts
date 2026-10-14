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
	nullDueDate: 'Null',
	today: 'Today',
	tomorrow: 'Tomorrow',
	dayAfterTomorrow: 'In 2 days',
	nextWeek: 'Next week',
	nextMonth: 'Next month',
	dueDateInCollection: 'Due {date}',
	taskCount: '{total} todo',
	subtaskProgress: '{completed}/{total} subtasks complete',
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
	completedTasks: 'Completed tasks',
	noCompletedTasks: 'No completed tasks',
	dragTask: 'Drag to reorder task',
	deleteTitle: 'Delete task?',
	deleteMessage: '“{title}” will be permanently removed.',
	cancel: 'Cancel',
	delete: 'Delete',
	noteNotFound: 'Linked note not found: {link}',
	dataFileName: 'Task data file',
	dataFileDesc: 'The active-task JSON path relative to the vault root. Completed tasks use a matching -completed.json file.',
	showCompletedName: 'Expand completed tasks',
	showCompletedDesc: 'Expand the separate completed tasks section by default.',
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
	dueDate: '截止日期', nullDueDate: '无', today: '今天', tomorrow: '明天', dayAfterTomorrow: '后天', nextWeek: '下周', nextMonth: '下个月', dueDateInCollection: '截止 {date}', taskCount: '{total} 个待办', subtaskProgress: '子任务已完成 {completed}/{total}', clearDueDate: '清除截止日期', doubleClickToAdd: '双击以添加任务',
	expandSubtasks: '显示子任务', collapseSubtasks: '收起子任务',
	linkedNotes: '关联笔记', addLinkedNote: '添加关联笔记', notePathPlaceholder: '笔记路径或 [[内部链接]]',
	subtasks: '子任务', addSubtask: '添加子任务', subtaskPlaceholder: '子任务', remove: '移除',
	saveChanges: '保存更改', deleteTask: '删除任务', completed: '已完成', completedTasks: '完成的任务', noCompletedTasks: '暂无已完成任务', dragTask: '拖拽以移动任务',
	deleteTitle: '删除任务？', deleteMessage: '“{title}”将被永久移除。', cancel: '取消', delete: '删除',
	noteNotFound: '未找到关联笔记：{link}',
	dataFileName: '任务数据文件', dataFileDesc: '相对于 Vault 根目录的未完成任务 JSON 路径；已完成任务自动存入对应的 -completed.json 文件。',
	showCompletedName: '展开完成的任务', showCompletedDesc: '默认展开独立的“完成的任务”栏。',
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
