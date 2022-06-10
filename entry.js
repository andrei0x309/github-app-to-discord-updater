import express from 'express';
import { githubEntryMiddleware } from './github-app-entry.js';

const app = express();
const port = 5310;
app.use('/github', githubEntryMiddleware);
app.listen(port, '0.0.0.0', () => console.log(`Listening on port ${port}`));
