export interface LogRow {
	timestamp: Date;
	method: string;
	url: string;
	status: number;
	responseTime: number;
}

function parseLine(line: string): LogRow {
	const parts = line.split(' - ');
	const [method, path] = parts[1].split(' ');
	return {
		timestamp: new Date(parts[0]),
		method: method,
		url: path,
		status: parseInt(parts[2]),
		responseTime: parseInt(parts[3])
	};
}

export function parseLogFile(content: string): LogRow[] {
	return content
		.split('\n')
		.filter(line => /^\d+-\d+-\d+ \d\d:\d\d:\d\d - /.test(line))
		.map(line => parseLine(line));
}

export interface LogGroup {
	timestamp: Date;
	rows: LogRow[];
}

export function groupLogs(logs: LogRow[], timeframe: number): LogGroup[] {
	// Sort logs by timestamp
	logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	const groups: LogGroup[] = [];
	let currentTime = logs[0].timestamp.getTime(); // start from the first log timestamp
	const endTime = logs[logs.length - 1].timestamp.getTime(); // end at the last log timestamp

	let logIndex = 0; // to keep track of the current log

	// create groups at regular intervals
	while (currentTime <= endTime) {
		const group: LogGroup = {
			timestamp: new Date(currentTime),
			rows: []
		};

		// Add all logs in the current timeframe to the group
		while (logIndex < logs.length && logs[logIndex].timestamp.getTime() < currentTime + timeframe) {
			group.rows.push(logs[logIndex]);
			logIndex++;
		}

		groups.push(group);

		// Move to the next timeframe
		currentTime += timeframe;
	}

	return groups;
}

export function getRequestsPerGroup(groups: LogGroup[]): number[] {
	return groups.map(group => group.rows.length);
}

export function getAverageResponseTimesPerGroup(groups: LogGroup[]): number[] {
	return groups.map(group => {
		const responseTimes = group.rows.map(row => row.responseTime);
		return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
	});
}
