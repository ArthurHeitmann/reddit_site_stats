import subprocess
import pushbullet
from pushbullet import Pushbullet
from dotenv import load_dotenv
import os
import traceback
import time

load_dotenv()

apiKey = os.getenv("pushbulletApiKey")
if apiKey is None:
    print("pushbulletApiKey not set in .env file")
    exit()
command = ["node", "--max-old-space-size=4096", "src/app.js"]
dir_path = os.path.dirname(os.path.realpath(__file__))

try:
    while True:
        try:
            process = subprocess.check_call(command)
        except subprocess.CalledProcessError:
            print("Script crashed")
            traceback.print_exc()
            try:
                pb = Pushbullet(apiKey)
                push = pb.push_note("Script Crash Alert", "Your script has crashed.")
            except:
                print("Pushbullet error")
#             print("Waiting 5 seconds before restarting")
#             time.sleep(5)
except KeyboardInterrupt:
    print("Script stopped by user")
