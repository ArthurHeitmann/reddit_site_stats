import {NextFunction, Request, Response} from "express";
import {createWriteStream} from "fs";

const logPath = "requestLog.txt";

const logStream = createWriteStream(logPath, {flags: 'a'});

export function logMiddleWare(req: Request, res: Response, next: NextFunction) {
	const start = Date.now();
	res.on('finish', () => {
		const duration = Date.now() - start;
		const log = `${logTimeStamp()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;

		console.log(log);
		logStream.write(log + "\n");
	});
	next();
}

function logTimeStamp(): string {
	return new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
}
