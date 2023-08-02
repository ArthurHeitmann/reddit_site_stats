import json

srcJsonPath = r"subredditTypes.json"
destInfoPath = r"subredditTypes_info.json"
destHistoryPath = r"subredditTypes_history.txt"

print("Loading JSON...")
with open(srcJsonPath, "r") as f:
    srcJson: dict[str, dict] = json.load(f)

print("Extracting info...")
infos: dict[str, dict] = {}
for subName, subData in srcJson.items():
	info = {}
	for key, value in subData.items():
		if key == "typeHistory":
			continue
		info[key] = value
	
	infos[subName] = info

print("Saving info...")
with open(destInfoPath, "w") as f:
	json.dump(infos, f, separators=(",", ":"))

print("Extracting history...")
with open(destHistoryPath, "w", encoding="utf-8") as f:
	for subName, subData in srcJson.items():
		f.write(f"r/{subName}\n")
		f.write(json.dumps(subData["typeHistory"], separators=(",", ":")) + "\n")
