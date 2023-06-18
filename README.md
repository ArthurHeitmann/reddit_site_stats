# Tracking the great reddit blackout

[blackout.photon-reddit.com](https://blackout.photon-reddit.com)

## What is this?

The goal of this project is to keep track of and visualize the great reddit blackout.

## Raw data

You can find the raw data in the [releases](https://github.com/ArthurHeitmann/reddit_site_stats/releases) page. The data is in json. The TS interface for per minute data is [here](/src/missions/PerMinuteLoggerMission.ts) and for subreddit data [here](/src/missions/SubredditTypesLoggerMission.ts). Per minute data timestamps are in seconds (because that's what the reddit api returns) and subreddit data timestamps are in milliseconds.

## Running this locally

### Requirements

- Node.js

### Setting up a reddit app

1. Go to https://www.reddit.com/prefs/apps/
2. Click on "create another app..."
3. Select "script"
4. Fill in the required fields. The redirect uri can be anything.
5. Click on "create app"
6. Copy the client id and client secret
7. Put them into a new file called `.env` in the root of this project. It should look like this:

```
clientId = "your client id"
secret = "your client secret"
```

### Steps

1. Clone this repo
2. (Optionally) If you want to use my already tracked data, download and extract the loggedData.zip from the [releases](https://github.com/ArthurHeitmann/reddit_site_stats/releases) page.
3. Run `npm install`
4. Run `npm run build`
5. Run `npm start`
6. Open http://localhost:8080 in your browser
