# github-app-to-discord updater

## Description

You can use this repo to listen to updates of github repos and sent them to a discord channel, works with private and public repos.

## Requriments

- Discord bot authorized to your discord server. ( must create the botshould have the least permissions to send messeges and create channels )
- Github app authorized to your github account or org you want to listen to. ( must have the least permissions to read most repos events push, pull requests, issues, stars etc )
- Github app webhook must be set to where this repo will listen the webhook. Default is `your-dns/github/webhook`
- A container / server to run this nodejs app. ( won't work with a sevrerless platform because you need to keep the discord bot alive )

## Usage

create .env file after the model of .env.example
Run localy with `npm start`

### Notes

If you have the word `private` or `secret` in your branch name, no updates related to that branch will be sent to discord.

### Contributing

If you have suggestions for how github-discord-bot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

### License

[MIT](LICENSE) © 2022 andrei0x309 <andrei@flashsoft.eu>
