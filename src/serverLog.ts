import {NextFunction, Request, Response} from "express";
import {createWriteStream} from "fs";
import {groupLogs, LogGroup, LogRow} from "./trackerTracking";

const logPath = "requestLog.txt";

const logStream = createWriteStream(logPath, {flags: 'a'});

export class LogMiddleWare {
	logs: LogRow[]|null = null;
	groupTimeFrame = 1000 * 60 * 5;

	async init(): Promise<void> {
		// const logPath = "requestLog.txt";
		// const log = await fsp.readFile(logPath, "utf8");
		// this.logs = parseLogFile(log);
	}

	middleWare(req: Request, res: Response, next: NextFunction) {
		const startDate = new Date();
		const start = startDate.getTime();
		const newRow: LogRow = {
			timestamp: startDate,
			method: req.method,
			url: req.originalUrl,
			status: 0,
			responseTime: 0
		}
		res.on('finish', () => {
			const duration = Date.now() - start;
			newRow.status = res.statusCode;
			newRow.responseTime = duration;
			// if (this.logs != null) {
			// 	this.logs.push(newRow);
			// }
			const log = `${logTimeStamp(startDate)} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
			console.log(log);
			logStream.write(log + "\n");
		});
		next();
	}

	groupLogs(): LogGroup[]|null {
		if (this.logs === null)
			return null;
		return groupLogs(this.logs, this.groupTimeFrame);
	}
}

function logTimeStamp(date: Date): string {
	return date.toISOString().replace(/T/, " ").replace(/\..+/, "");
}
