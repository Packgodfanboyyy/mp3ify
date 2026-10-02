# Static MP3 Music Player

A Spotify-style, **static** personal music website for GitHub Pages, Render Static Sites, or any static host.

## Add music

1. Put your `.mp3` files in `assets/music/`.
2. Add an entry for each file to `tracks.json`, for example:
   `{ "title": "My Song", "url": "assets/music/My Song.mp3" }`
3. Commit and push to GitHub.
4. Redeploy the site.

### Titles

The title is generated from the filename:

- `My Song.mp3` → **My Song**
- `late_night_drive.mp3` → **late night drive**
- `Track-01.mp3` → **Track 01**

If you want a specific title, rename the MP3 file before uploading it.

## Deploy on Render

Create a **Static Site** in Render and connect this repository.

Use:

- **Build Command:** `No build command` (or leave it blank)
- **Publish Directory:** `.`
- **Auto-Deploy:** On

Render will serve `index.html` directly.

## GitHub Pages

This also works with GitHub Pages. In the repository, go to:

**Settings → Pages → Deploy from a branch**

Select your branch and the repository root (`/`).

## Notes

- There is no database and no server-side audio player.
- MP3 files are served directly from the repository.
- The browser plays the files locally in the visitor's browser.
- The GitHub repository is therefore also the music storage.
- Very large audio libraries can make a Git repository unwieldy. Git LFS or external object storage may be preferable for large collections.


### Playback controls
The player includes EQ, bass boost, linked tempo/pitch, Media Session controls for supported mobile browsers, and responsive iPhone/iPad controls. iOS may still suspend web audio in some system situations.
