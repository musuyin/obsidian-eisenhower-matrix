import { App, PluginSettingTab, Setting } from 'obsidian';
import ObsidianEisenhowerMatrixPlugin from './main';

export interface ObsidianEisenhowerMatrixSettings {
	dataFilePath: string;
	showCompletedTasks: boolean;
}

export const DEFAULT_SETTINGS: ObsidianEisenhowerMatrixSettings = {
	dataFilePath: 'TODO/obsidian-eisenhower-matrix.json',
	showCompletedTasks: false,
};

export class ObsidianEisenhowerMatrixSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ObsidianEisenhowerMatrixPlugin) {
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
					.setPlaceholder('TODO/obsidian-eisenhower-matrix.json')
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
