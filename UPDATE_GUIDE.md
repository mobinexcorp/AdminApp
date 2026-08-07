# MobinexCorpAdmin automatic updates

This project now uses `electron-updater` + GitHub Releases. The installed Windows app does not replace itself with a BAT file. Instead, Electron downloads the signed/packaged NSIS update, then installs it when the app restarts.

## One-time setup

1. Put this project in a GitHub repository. For the simplest updater, keep the repository/releases public.
2. Open a terminal in this project and run `npm install`.
3. Run `setup-updates.bat` (or `npm run configure:updates`). Enter your GitHub username/organization and repository name.
4. Create a GitHub Personal Access Token that can create releases/assets for that repository.
5. In the PowerShell terminal you use to publish, set it for that session:

   `$env:GH_TOKEN="github_pat_YOUR_TOKEN"`

   Do **not** put the token in your source code or commit it to GitHub.

## Build the first installable version

Run:

`npm run dist`

Install the generated `release/MobinexCorpAdmin-Setup-<version>.exe` on your PC. Auto-update works in the installed/packaged application, not `npm run dev`.

## Publish each future update

After changing your source code:

1. Bring the newest source files into this project (or `git pull` if AI Studio/GitHub is your source workflow).
2. Open PowerShell and set `GH_TOKEN` for that terminal if it is not already set.
3. Run `update.bat`.
4. Enter a version higher than the installed version, such as `1.0.1`, `1.0.2`, etc.
5. The script updates `package.json`, builds the app, generates the NSIS installer and `latest.yml`, and uploads the release through electron-builder.

Installed copies check automatically about five seconds after launch. Users can also use **Help > Check for Updates**.

## Local data

Electron application updates replace application files, not Electron's user-data directory. Data that your app stores in its normal persistent user-data/local-storage location remains separate from the installed executable. As with any business data, keep backups.

## Important notes

- Version numbers must increase for updates to be detected.
- `electron-updater` is intentionally disabled during development (`npm run dev`).
- Public GitHub release assets are easiest because installed apps do not need a GitHub token.
- `GH_TOKEN` is only required on the developer PC when publishing a release.
- Production distribution is stronger with Windows code signing. Unsigned installers may trigger Windows SmartScreen warnings.
