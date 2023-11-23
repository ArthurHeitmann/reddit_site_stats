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

/**
 * Finds the index of the item in the array that is closest to the given value,
 * using binary search.
 */
export function findClosestIndex<T>(items: T[], value: number, getValue: (e: T) => number): number {
	let minIndex = 0;
	let maxIndex = items.length - 1;
	let currentIndex: number;
	let currentElement: number;

	while (minIndex <= maxIndex) {
		currentIndex = Math.floor((minIndex + maxIndex) / 2);
		currentElement = getValue(items[currentIndex]);

		if (currentElement < value) {
			minIndex = currentIndex + 1;
		} else if (currentElement > value) {
			maxIndex = currentIndex - 1;
		} else {
			return currentIndex;
		}
	}

	if (currentIndex === 0) {
		return currentIndex;
	} else if (currentIndex === items.length - 1) {
		return currentIndex;
	} else {
		const prevElement = getValue(items[currentIndex - 1]);
		const nextElement = getValue(items[currentIndex + 1]);
		if (Math.abs(prevElement - value) < Math.abs(nextElement - value)) {
			return currentIndex - 1;
		} else {
			return currentIndex;
		}
	}
}
