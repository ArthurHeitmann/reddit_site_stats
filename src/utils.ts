import fs, {promises as fsp} from "fs";
import stream, {Readable} from 'stream';
import {promisify} from 'util';


export async function fileExists(path: string): Promise<boolean> {
	try {
		await fsp.access(path, fs.constants.F_OK);
		return true;
	} catch (e) {
		return false;
	}
}

function objectOrArrayToStream(data: Record<string, unknown> | unknown[]): Readable {
	let entries: [string, unknown][] | unknown[];
	let startChar: string, endChar: string, isObject: boolean;

	if (Array.isArray(data)) {
		entries = data;
		startChar = '[';
		endChar = ']';
		isObject = false;
	} else {
		entries = Object.entries(data);
		startChar = '{';
		endChar = '}';
		isObject = true;
	}

	let index = 0;
	return new Readable({
		objectMode: true,
		read() {
			if (index === 0)
				this.push(startChar);
			else if (index < entries.length)
				this.push(',');

			if (index < entries.length) {
				if (isObject) {
					let [key, value] = entries[index] as [string, unknown];
					this.push(JSON.stringify({[key]: value}).replace(/^\{|}$/g, ''));
				} else {
					this.push(JSON.stringify(entries[index]));
				}
				index += 1;
			} else {
				this.push(endChar);
				this.push(null);
			}
		},
	});
}

function saveBigJson(file: string, obj: Record<string, unknown> | unknown[]): Promise<void> {
	const writeStream = fs.createWriteStream(file);
	const readStream = objectOrArrayToStream(obj);

	return promisify(stream.pipeline)(readStream, writeStream);
}

export async function saveJsonSafely(obj: Record<string, unknown> | unknown[], file: string): Promise<void> {
	try {
		// backup old file
		if (await fileExists(file)) {
			if (await fileExists(file)) {
				const backupFile = file + ".bak";
				await fsp.copyFile(file, backupFile);
			}
		}
		// save new file to temp file
		const tempFile = file + ".tmp";
		const t1 = Date.now();
		await saveBigJson(tempFile, obj);
		const t2 = Date.now();
		console.log(`Saved ${file} in ${t2 - t1}ms`);
		// rename temp file to actual file
		await fsp.rename(tempFile, file);
	} catch (e) {
		console.error("Error saving json file");
		console.error(e);
	}
}
