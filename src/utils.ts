import fs, {promises as fsp} from "fs";


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
