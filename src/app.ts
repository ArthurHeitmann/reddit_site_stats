import {RedditAuth} from './redditApi';
import {Server} from "./server";
import {LoggingMissions} from "./missions/LoggingMissions";
import dotenv from "dotenv";


async function main() {
	dotenv.config();
	const { clientId, secret } = process.env;
	if (!clientId || !secret) {
		throw new Error("Missing clientId or secret in .env file");
	}
	const auth = new RedditAuth(clientId, secret);
	await auth.loadFromFile();
	const loggingMissions = new LoggingMissions(auth);
	await loggingMissions.init();
	const server = new Server(8080, loggingMissions)
	loggingMissions.start();
	server.start();
}

main().catch(console.error);
