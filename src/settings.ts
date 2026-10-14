import { App, PluginSettingTab, Setting } from 'obsidian';
import { Language, translate } from './i18n';
import ObsidianEisenhowerMatrixPlugin from './main';

export interface ObsidianEisenhowerMatrixSettings {
	dataFilePath: string;
	showCompletedTasks: boolean;
	language: Language;
}

export const DEFAULT_SETTINGS: ObsidianEisenhowerMatrixSettings = {
	dataFilePath: 'TODO/obsidian-eisenhower-matrix.json',
	showCompletedTasks: false,
	language: 'en',
};

export class ObsidianEisenhowerMatrixSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ObsidianEisenhowerMatrixPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const t = (key: Parameters<typeof translate>[1]) => translate(this.plugin.settings.language, key);
		new Setting(containerEl)
			.setName(t('dataFileName'))
			.setDesc(t('dataFileDesc'))
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
			.setName(t('showCompletedName'))
			.setDesc(t('showCompletedDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showCompletedTasks).onChange(async (value) => {
					this.plugin.settings.showCompletedTasks = value;
					await this.plugin.saveSettings();
					void this.plugin.refreshViews();
				}),
			);

		new Setting(containerEl)
			.setName(t('languageName'))
			.setDesc(t('languageDesc'))
			.addDropdown((dropdown) =>
				dropdown
					.addOption('en', t('english'))
					.addOption('zh', t('chinese'))
					.setValue(this.plugin.settings.language)
					.onChange(async (value) => {
						this.plugin.settings.language = value as Language;
						await this.plugin.saveSettings();
						this.display();
						void this.plugin.refreshViews();
					}),
			);
	}
}
