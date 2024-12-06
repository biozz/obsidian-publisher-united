import { Octokit as OctokitBase } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Base64 } from "js-base64";
import {
	App,
	FrontMatterCache,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import { Telegraf } from "telegraf";
import TelegramifyMarkdown from "telegramify-markdown";

const frontmatterRegex = /^---\s*[\s\S]*?\s*---\s*/;
const Octokit = OctokitBase.plugin(restEndpointMethods);

interface PublisherUnitedSettings {
	githubToken: string;
	telegramBotToken: string;
}

const DEFAULT_SETTINGS: PublisherUnitedSettings = {
	githubToken: "",
	telegramBotToken: "",
};

export default class PublisherUnited extends Plugin {
	settings: PublisherUnitedSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "PublisherUnited-current-file",
			name: "Publish current file",
			checkCallback: (checking: boolean) => {
				if (checking) {
					return !!this.app.workspace.getActiveFile();
				}
				try {
					const currentFile = this.app.workspace.getActiveFile();
					if (!currentFile) {
						new Notice("No active file found.");
						return;
					}
					if (currentFile.extension !== "md") {
						new Notice(
							"The current file is not a markdown file. Please open a markdown file and try again.",
						);
						return;
					}

					new Notice("Publishing note...");

					publish(this.settings, this.app, currentFile);

					new Notice(`✅ Successfully published note`);
				} catch (e) {
					console.error(e);
					new Notice(
						"❌ Unable to publish note, see developer console for details",
					);
				}
			},
		});

		this.addSettingTab(new PublisherUnitedSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

const publish = async (
	settings: PublisherUnitedSettings,
	app: App,
	f: TFile,
) => {
	const content = await app.vault.read(f);
	const frontmatter = app.metadataCache.getCache(f.path)?.frontmatter;
	if (!frontmatter) {
		return;
	}

	if (frontmatter.telegram_channel) {
		await publishTelegram(app, settings, f, frontmatter, content);
	} else if (frontmatter.github_repo) {
		await publishGithub(settings, f, frontmatter, content);
	}
};

const publishTelegram = async (
	app: App,
	settings: PublisherUnitedSettings,
	f: TFile,
	frontmatter: FrontMatterCache,
	content: string,
) => {
	const bot = new Telegraf(settings.telegramBotToken);
	content = content.replace(frontmatterRegex, "");
	content = TelegramifyMarkdown(content, "keep");

	if (frontmatter.telegram_message_id) {
		try {
			await bot.telegram.editMessageText(
				frontmatter.telegram_channel,
				frontmatter.telegram_message_id,
				undefined,
				content,
				{
					parse_mode: "MarkdownV2",
				},
			);
			return;
		} catch (e) {
			console.error(e);
			return;
		}
	}

	try {
		const result = await bot.telegram.sendMessage(
			frontmatter.telegram_channel,
			content,
			{
				parse_mode: "MarkdownV2",
			},
		);
		app.fileManager.processFrontMatter(f, (fm) => {
			fm["telegram_message_id"] = result.message_id;
			fm["telegram_published_at"] = result.date;
			let telegramChannel = frontmatter.telegram_channel;
			// it doesn't really matter,
			// because https://t.me/@username still works
			// but the url is nicer without the @
			if (frontmatter.telegram_channel.startsWith("@")) {
				telegramChannel = frontmatter.telegram_channel.slice(1);
			}
			fm["telegram_url"] =
				`https://t.me/${telegramChannel}/${result.message_id}`;
		});
	} catch (e) {
		console.error(e);
	}
};

const publishGithub = async (
	settings: PublisherUnitedSettings,
	f: TFile,
	frontmatter: FrontMatterCache,
	content: string,
) => {
	content = Base64.encode(content);
	// TODO: improve it by checking if the path contains the filename
	let path = `${frontmatter.repo_path}/${f.name}`;
	path = decodeURI(path);
	const [owner, repo] = frontmatter.github_repo.split("/");

	const octokit = new Octokit({ auth: settings.githubToken });
	const payload = {
		owner: owner,
		repo: repo,
		path,
		message: `obsidian-PublisherUnited: ${path}`,
		content,
		sha: "",
	};

	try {
		const response = await octokit.rest.repos.getContent({
			owner: owner,
			repo: repo,
			path,
		});
		if (
			response.status === 200 &&
			// This is important, otherwise typing doesn't work
			"type" in response.data &&
			response.data.type == "file"
		) {
			payload.message = `obsidian-PublisherUnited: ${path}`;
			payload.sha = response.data.sha;
		}
	} catch {
		// don't fail, file just doesn't exist in the repo yet
	}
	await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", payload);
};

class PublisherUnitedSettingTab extends PluginSettingTab {
	plugin: PublisherUnited;

	constructor(app: App, plugin: PublisherUnited) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setName("GitHub Token").addText((text) =>
			text
				.setPlaceholder("GitHub Token")
				.setValue(this.plugin.settings.githubToken)
				.onChange(async (value) => {
					this.plugin.settings.githubToken = value;
					await this.plugin.saveSettings();
				}),
		);
		new Setting(containerEl).setName("Telegram Bot Token").addText((text) =>
			text
				.setPlaceholder("Telegram Bot Token")
				.setValue(this.plugin.settings.telegramBotToken)
				.onChange(async (value) => {
					this.plugin.settings.telegramBotToken = value;
					await this.plugin.saveSettings();
				}),
		);
	}
}
