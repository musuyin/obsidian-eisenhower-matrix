import { App, PluginSettingTab } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
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

	getSettingDefinitions(): SettingDefinitionItem[] {
		const t = (key: Parameters<typeof translate>[1]) => translate(this.plugin.settings.language, key);
		return [
			{
				name: t('dataFileName'),
				desc: t('dataFileDesc'),
				control: { type: 'text', key: 'dataFilePath', defaultValue: DEFAULT_SETTINGS.dataFilePath, placeholder: DEFAULT_SETTINGS.dataFilePath },
			},
			{
				name: t('showCompletedName'),
				desc: t('showCompletedDesc'),
				control: { type: 'toggle', key: 'showCompletedTasks', defaultValue: DEFAULT_SETTINGS.showCompletedTasks },
			},
			{
				name: t('languageName'),
				desc: t('languageDesc'),
				control: { type: 'dropdown', key: 'language', defaultValue: DEFAULT_SETTINGS.language, options: { en: t('english'), zh: t('chinese') } },
			},
		];
	}

	getControlValue(key: string): unknown {
		if (key in this.plugin.settings) return this.plugin.settings[key as keyof ObsidianEisenhowerMatrixSettings];
		return undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		switch (key) {
			case 'dataFilePath':
				this.plugin.settings.dataFilePath = typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_SETTINGS.dataFilePath;
				break;
			case 'showCompletedTasks':
				if (typeof value !== 'boolean') return;
				this.plugin.settings.showCompletedTasks = value;
				break;
			case 'language':
				if (value !== 'en' && value !== 'zh') return;
				this.plugin.settings.language = value;
				break;
			default:
				return;
		}
		await this.plugin.saveSettings();
		if (key === 'language') this.update();
		await this.plugin.refreshViews();
	}
}
