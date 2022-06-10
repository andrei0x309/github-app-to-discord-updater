import { config } from 'dotenv';
import { createNodeMiddleware, Probot } from "probot"
import { githubAppMain } from "./github-main-fn.js"

config();

const probot = new Probot({
  appId: process.env['GITHUB_APP_ID'],
  privateKey: process.env['GITHUB_APP_PRIVATE_KEY'],
  secret: process.env['GITHUB_APP_WEBHOOK_SECRET'],
  webhookPath: "/webhook",
});

export const githubEntryMiddleware = createNodeMiddleware(githubAppMain, { probot });
