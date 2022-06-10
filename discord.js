import { Client, Intents } from 'discord.js'
import { create as createLogger } from './logger'

const logger = createLogger('discord-bot')

let cacheGithubCannelId: string | null = null

const intentsArray = [
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MEMBERS,
  Intents.FLAGS.GUILD_INTEGRATIONS,
  Intents.FLAGS.GUILD_WEBHOOKS,
  Intents.FLAGS.GUILD_INVITES,
  Intents.FLAGS.GUILD_VOICE_STATES,
  Intents.FLAGS.GUILD_PRESENCES,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  Intents.FLAGS.GUILD_MESSAGE_TYPING,
  Intents.FLAGS.DIRECT_MESSAGES,
  Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  Intents.FLAGS.DIRECT_MESSAGE_TYPING,
  Intents.FLAGS.DIRECT_MESSAGE_TYPING,
  Intents.FLAGS.DIRECT_MESSAGE_TYPING
]

const bitWiseIntentFlags = intentsArray.reduce((a, b) => a | b, 0)

const TEST_DISCORD_SERVER =  process.env.TEST_DISCORD_SERVER || 'test-discord-server'
const PROD_DISCORD_SERVER =  process.env.PROD_DISCORD_SERVER

export const discordBot = new Client({ intents: bitWiseIntentFlags })
const DISCORD_TOKEN = process.env.DISCORD_TOKEN
export const DISCORD_GITHUB_CHANNEL = process.env.DISCORD_GITHUB_CHANNEL

const getGuild = async () => {
  try {
    const guilds = await discordBot.guilds.fetch()
    let guild
    if (process.env.NODE_ENV === 'production') {
      guild = guilds.find(guild => guild.name === PROD_DISCORD_SERVER)
    } else {
      guild = guilds.find(guild => guild.name === TEST_DISCORD_SERVER)
    }
    if (!guild) {
      throw new Error('Could not find guild')
    }
    return guild
  } catch (error) {
    logger.error(error)
  }
}

const checkAndTryToCreateChannel = async () => {
  try {
    const guild = discordBot.guilds.resolve((await getGuild()).id)
    const channels = await guild.channels.fetch()
    const channel = channels.find(channel => channel.name === DISCORD_GITHUB_CHANNEL)
    cacheGithubCannelId = channel ? channel.id : null
    if (!channel) {
      cacheGithubCannelId = (await guild.channels.create(DISCORD_GITHUB_CHANNEL as string, { reason: `Missing channel ${DISCORD_GITHUB_CHANNEL}` })).id
    }
    return cacheGithubCannelId
  } catch (error) {
    logger.error(error)
  }
}

discordBot.on('ready', () => {
  logger.info(`Logged in as ${discordBot?.user?.tag}!`)
  checkAndTryToCreateChannel()
})

discordBot.on('disconnect', _ => {
  logger.warn('Disconnected, attempting to reconnect...')
  discordBot.login(DISCORD_TOKEN)
})

export const notifyGithubChannel = async (message) => {
  try {
    let channel
    const guild = discordBot.guilds.resolve((await getGuild()).id)
    if (cacheGithubCannelId) {
      channel = await guild.channels.fetch(cacheGithubCannelId)
    } else {
      const channelId = (await checkAndTryToCreateChannel()) as string
      channel = await guild.channels.fetch(channelId)
    }
    if (channel) {
      channel.send(message)
    } else {
      logger.error('Error Channel not found')
    }
  } catch (error) {
    logger.error(error)
  }
}

discordBot.login(DISCORD_TOKEN)
