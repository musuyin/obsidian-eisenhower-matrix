import { App, PluginSettingTab, Setting } from 'obsidian';
import TaskQuadrantPlugin from './main';

export interface TaskQuadrantSettings {
	dataFilePath: string;
	showCompletedTasks: boolean;
}

export const DEFAULT_SETTINGS: TaskQuadrantSettings = {
	dataFilePath: 'TODO/task-quadrant.json',
	showCompletedTasks: false,
};

export class TaskQuadrantSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: TaskQuadrantPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName('任务数据文件')
			.setDesc('相对于 Vault 根目录的 JSON 文件路径。修改后，新任务会保存到新位置。')
			.addText((text) =>
				text
					.setPlaceholder('TODO/task-quadrant.json')
					.setValue(this.plugin.settings.dataFilePath)
					.onChange(async (value) => {
						this.plugin.settings.dataFilePath = value.trim() || DEFAULT_SETTINGS.dataFilePath;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('显示已完成任务')
			.setDesc('在四象限中默认显示已完成的任务。')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showCompletedTasks).onChange(async (value) => {
					this.plugin.settings.showCompletedTasks = value;
					await this.plugin.saveSettings();
					void this.plugin.refreshViews();
				}),
			);
	}
}
