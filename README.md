# Tracking the great reddit blackout

[blackout.photon-reddit.com](https://blackout.photon-reddit.com)

## What is this?

The goal of this project is to keep track of and visualize the great reddit blackout.

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
2. Run `npm install`
3. Run `npm run build`
4. Run `npm start`
5. Open http://localhost:8080 in your browser
