import { notifyGithubChannel } from 'discord.js'

export const githubAppMain = (app) => {
  app.log.info('Github App Started !')

  const allowedOrgs = process.env.ALLLOWED_ORGANIZATIONS.split(',')
  const secretTags = ['secret', 'private']
  let allowedRepos

  if (process.env.NODE_ENV === 'production') {
    allowedRepos = process.env.ALLLOWED_REPOS.split(',')
  } else {
    allowedRepos = process.env.ALLLOWED_REPOS.split(',')
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
    const messagePush = `\`\`\`fix\nA push was made to the repository "${context.payload.repository.full_name}"\n\`\`\``
    let messageCommits = ''
    for (const commit of context.payload.commits) {
      const { message, id, timestamp, author } = commit
      let { added, removed, modified } = commit
      let filesMessage = ''
      if (added.length > 0) {
        if (added.length > 6) {
          added = added.slice(0, 6)
          added.push('...')
        }
        filesMessage += `\n+ Added files: ${added.join(', ')}`
      }
      if (removed.length > 0) {
        if (removed.length > 6) {
          removed = removed.slice(0, 6)
          removed.push('...')
        }
        filesMessage += `\n- Removed files: ${removed.join(', ')}`
      }
      if (modified.length > 0) {
        if (modified.length > 6) {
          modified = modified.slice(0, 6)
          modified.push('...')
        }
        filesMessage += `\n+ Modified files: ${modified.join(', ')}`
      }
      if (filesMessage.length > 0) {
        filesMessage = `\`\`\`diff\n${filesMessage}\`\`\``
      }
      messageCommits = `${messageCommits}\n\`\`\`fix\nCommit: ${id.substring(0, 7)} at ${timestamp}\nMessage: ${message} \nAuthor: ${author.username}\`\`\` ${filesMessage}\n`
    }
    notifyGithubChannel(`${messagePush}\n${messageCommits}`)
  }

  const hwdStarCreated = async (context) => {
    const message = `\`\`\`fix\nRepo: ${context.payload.repository.full_name} was stared by ${context.payload.sender.login}\`\`\``
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
    const privateText = isPrivate ? '' : `\nUrl: <${url}>`
    const stats = `\`\`\`diff\nStats:\n\n+  No of commits: ${context.payload.pull_request.commits}\n+  No of additions: ${context.payload.pull_request.additions}\n-  No of deletions: ${context.payload.pull_request.deletions}\n+  No of changed files: ${context.payload.pull_request.changed_files}\`\`\``
    let message = `\`\`\`fix\n${user} opened a pull request on ${repo} at ${date}`
    message = `${message} on branch: ${branch} ${privateText}\`\`\` ${stats}`
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
    const stats = `\`\`\`diff\nStats:\n\n+  No of commits: ${context.payload.pull_request.commits}\n+  No of additions: ${context.payload.pull_request.additions}\n-  No of deletions: ${context.payload.pull_request.deletions}\n+  No of changed files: ${context.payload.pull_request.changed_files}\`\`\``
    const action = isMerged ? 'merged' : 'closed'
    const changeWillActivate = isMerged ? '\n> Changes wil become live in a few minutes...\n' : '\n'
    const message = `\`\`\`fix\n${user} ${action} branch: ${branch} on ${repo} at ${date}.\`\`\` ${changeWillActivate} ${stats}`
    notifyGithubChannel(message)
  }

  const hwdPullRequestSynchronized = async (context) => {
    const commitRef = context?.payload?.pull_request?.head?.ref
    if (secretTags.some(v => commitRef.includes(v))) {
      app.log.info('Ignoring secret tag push')
      return
    }
    const user = context.payload.pull_request.user.login
    const stats = `\`\`\`diff\nStats:\n\n+  No of commits: ${context.payload.pull_request.commits}\n+  No of additions: ${context.payload.pull_request.additions}\n-  No of deletions: ${context.payload.pull_request.deletions}\n+  No of changed files: ${context.payload.pull_request.changed_files}\`\`\``
    const message = `\`\`\`fix\n${user} synced pull request "${context.payload.pull_request.title}" on "${context.payload.repository.full_name}" \`\`\` ${stats}`
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
