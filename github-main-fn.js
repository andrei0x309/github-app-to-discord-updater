import { notifyGithubChannel } from '../../helpers/discord'

const { GITHUB_CHANNEL_ID } = process.env

export const githubAppMain = (app) => {
  app.log.info('Github App Started !')

  const allowedOrgs = ['andrei0x309', 'Yup-io']
  const secretTags = ['secret', 'private']
  let allowedRepos

  if (process.env.NODE_ENV === 'production') {
    allowedRepos = ['yup_docs', 'yup-monorepo', 'score-service', 'yup_extension', 'polygon-contracts', 'yup-live', 'gather-town-WS-POAP-bot', 'app-frontend']
  } else {
    allowedRepos = ['test-yup-monorepo', 'yup-monorepo']
  }

  const hwdIssueOpened = async (context) => {
    const message = `A new issue was opened in ${context.payload.repository.full_name} with title ${context.payload.issue.title}`
    notifyGithubChannel(message)
  }
  const hwdPush = async (context) => {
    const ignoreMergePushText = 'Merge pull request'
    const headCommit = context.payload.head_commit
    const commitRef = context?.payload?.ref
    if (secretTags.some(v => commitRef.includes(v))) {
      app.log.info('Ignoring secret tag push')
      return
    }
    if (!headCommit || headCommit.message.includes(ignoreMergePushText)) {
      app.log.info('Ignoring merge push')
      return
    }
    let messageRet = `A push was made to the repository "${context.payload.repository.full_name}"\n`
    for (const commit of context.payload.commits) {
      const { message, id, timestamp, author } = commit
      let { added, removed, modified } = commit
      let filesMessage = ''
      if (added.length > 0) {
        if (added.length > 10) {
          added = added.slice(0, 10)
          added.push('...')
        }
        filesMessage += `\nAdded files: ${added.join(', ')}`
      }
      if (removed.length > 0) {
        if (removed.length > 10) {
          removed = added.slice(0, 10)
          removed.push('...')
        }
        filesMessage += `\nRemoved files: ${removed.join(', ')}`
      }
      if (modified.length > 0) {
        if (modified.length > 10) {
          modified = added.slice(0, 10)
          modified.push('...')
        }
        filesMessage += `\nModified files: ${modified.join(', ')}`
      }
      if (filesMessage.length > 0) {
        filesMessage = `${filesMessage}\n`
      }
      messageRet = `${messageRet}\nCommit: ${id} at ${timestamp} commit message: "${message}" by author: **${author.username}** ${filesMessage}\n`
    }
    notifyGithubChannel(messageRet)
  }

  const hwdStarCreated = async (context) => {
    const message = `Repo "${context.payload.repository.full_name}" was stared by **${context.payload.sender.login}**`
    notifyGithubChannel(message)
  }

  const hwdPullRequestOpened = async (context) => {
    const commitRef = context?.payload?.pull_request?.head?.ref
    if (secretTags.some(v => commitRef.includes(v))) {
      app.log.info('Ignoring secret tag push')
      return
    }
    const repo = context.payload.repository.full_name
    const date = context.payload.pull_request.created_at
    const user = context.payload.pull_request.user.login
    const url = context.payload.pull_request.html_url
    const isPrivate = context?.payload?.repository?.private ?? false
    const branch = context?.payload?.pull_request?.head?.ref
    const privateText = isPrivate ? '' : ` with url: ${url}`
    const stats = `No of commits: ${context.payload.pull_request.commits}\n No of additions: ${context.payload.pull_request.additions}\n No of deletions: ${context.payload.pull_request.deletions}\n No of changed files: ${context.payload.pull_request.changed_files}`
    let message = `**${user}** opened a pull request on ${repo} at ${date}`
    message = `${message} on branch: ${branch}${privateText}. \nStats:\n ${stats}`
    notifyGithubChannel(message)
  }
  const hwdPullRequestClosed = async (context) => {
    const commitRef = context?.payload?.pull_request?.head?.ref
    if (secretTags.some(v => commitRef.includes(v))) {
      app.log.info('Ignoring secret tag push')
      return
    }
    const isMerged = 'merged_by' in context.payload.pull_request
    const repo = context.payload.repository.full_name
    const date = context.payload.pull_request.created_at
    const user = isMerged ? context.payload.pull_request.merged_by.login : context.payload.pull_request.user.login
    const branch = context?.payload?.pull_request?.head?.ref
    const stats = `No of commits: ${context.payload.pull_request.commits}\n No of additions: ${context.payload.pull_request.additions}\n No of deletions: ${context.payload.pull_request.deletions}\n No of changed files: ${context.payload.pull_request.changed_files}`
    const action = isMerged ? 'merged' : 'closed'
    const message = `**${user}** ${action} branch: **${branch}** on ${repo} at ${date}. \nChanges wil become live in a few minutes\nStats:\n ${stats}`
    notifyGithubChannel(message)
  }

  const hwdPullRequestSynchronized = async (context) => {
    const commitRef = context?.payload?.pull_request?.head?.ref
    if (secretTags.some(v => commitRef.includes(v))) {
      app.log.info('Ignoring secret tag push')
      return
    }
    const stats = `No of commits: ${context.payload.pull_request.commits}\n No of additions: ${context.payload.pull_request.additions}\n No of deletions: ${context.payload.pull_request.deletions}\n No of changed files: ${context.payload.pull_request.changed_files}`
    const message = `The pull request "${context.payload.pull_request.title}" request was synchronized on the repository ${context.payload.repository.full_name} \nStats:\n ${stats}`
    notifyGithubChannel(message)
  }

  function currieFilter (context) {
    // eslint-disable-next-line
    // @ts-ignore
    const { fn } = this
    try {
      const [org, repo] = context.payload.repository.full_name.split('/')
      if (!allowedOrgs.includes(org) || !allowedRepos.includes(repo)) {
        throw new Error('Skip Org or Repo not on allowed list')
      }
      return fn(context)
    } catch (e) {
      app.log.info(e)
    }
  }

  const eventHandlers = {
    'issues.opened': currieFilter.bind({ fn: hwdIssueOpened }),
    push: currieFilter.bind({ fn: hwdPush }),
    'pull_request.opened': currieFilter.bind({ fn: hwdPullRequestOpened }),
    'star.created': currieFilter.bind({ fn: hwdStarCreated }),
    'pull_request.closed': currieFilter.bind({ fn: hwdPullRequestClosed }),
    'pull_request.synchronize': currieFilter.bind({ fn: hwdPullRequestSynchronized })
  }

  for (const event of Object.keys(eventHandlers)) {
    app.on(event, eventHandlers[event])
  }
}
