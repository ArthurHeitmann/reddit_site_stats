import fs, {promises as fsp} from "fs";

const base36Alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

export function base36Encode(num: number): string {
	let str = "";
	while (num > 0) {
		const remainder = num % 36;
		num = Math.floor(num / 36);
		str = base36Alphabet[remainder] + str;
	}
	return str;
}

export function base36Decode(str: string): number {
	let num = 0;
	for (let i = 0; i < str.length; i++) {
		const digit = str[i];
		const digitValue = base36Alphabet.indexOf(digit);
		if (digitValue === -1)
			throw new Error(`Invalid base36 digit: ${digit}`);
		num = num * 36 + digitValue;
	}
	return num;
}

export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fileExists(path: string): Promise<boolean> {
	try {
		await fsp.access(path, fs.constants.F_OK);
		return true;
	} catch (e) {
		return false;
	}
}

export async function saveJsonSafely(obj: any, file: string): Promise<void> {
	try {
		// backup old file
		if (await fileExists(file)) {
			if (await fileExists(file)) {
				const backupFile = file + ".bak";
				await fsp.copyFile(file, backupFile);
			}
		}
		const json = JSON.stringify(obj);
		// save new file to temp file
		const tempFile = file + ".tmp";
		await fsp.writeFile(tempFile, json);
		// rename temp file to actual file
		await fsp.rename(tempFile, file);
	} catch (e) {
		console.error("Error saving json file", e);
		console.error(e);
	}
}
