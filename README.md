# Publisher United

This is an [Obsidian.md](https://obisidian.md) plugin to publish notes to various sources.

Currently supported sources:

- GitHub
- Telegram channels

The plugin uses frontmatter to configure the way the note is published. In this regard it is different from Enveloppe, which uses settings only.

Publisher United has several opinions about how things should be written to be able to properly publish:

- publishing is configured via frontmatter as much as possible
- nots, which are published to Telegram will have first heading converted to bold text

## How to

### Publishing to GitHub repo

- Create or use exising GitHub API Token and add it to the plugin settings
- Make sure that your GitHub API Token is configured properly, i.e. has access to writing to target repository
- Open target note, add `github_repo: <org>/<repo>` and `repo_path: content/blog`
- Use `Publisher United: Publish current file` command
- The plugin will commit the file to the repo to the specified path

Note: the plugin will add entire file contents to the repo, including every frontmatter key and value.

### Publishing to Telegram channel

- Create or use existing Telegram Bot Token and add to the plugin settings
- Add your bot to the target channel and make sure that it is configured properly (via BotFather), i.e. it should be able to post messages to the channel
- Open target note and add `telegram_channel: "@mychannel"` to the frontmatter
- Call `Publisher United: Publish current file`
- The plugin will publish the file to the channel and add two more keys to the frontmatter: `telegram_message_id` (for post updates) and `telegram_url` (for convenience)
- If you publish with `telegram_message_id` filled, than the plugin will update the post instead of publishing

Note: first heading of the note will be converted to bold text, everything else will be converted to `MardownV2` format, including code blocks, quotes, etc.

## Alternatives

TODO (expand on enveloppe and flowershow)

## Contributing

Please create a bug or a feature and I will do my best to respond. PRs are always welcome.

I wanted to have some fun with this plugin. It is named Publisher United, because it is about publishing stuff and it is aimed for published on various platforms, hence "united".
Coincedentally, there is a football club with the name "Manchester United". That's why each version is named after a [Manchester United F.C. manager](https://en.wikipedia.org/wiki/List_of_Manchester_United_F.C._managers).
