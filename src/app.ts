import {RedditAuth} from './redditApi';
import {Server} from "./server";
import {LoggingMissions} from "./missions/LoggingMissions";

async function main() {
	const auth = new RedditAuth();
	await auth.loadFromFile();
	const server = new Server();
	const loggingMissions = new LoggingMissions(auth);
	loggingMissions.start();
}

main().catch(console.error);
