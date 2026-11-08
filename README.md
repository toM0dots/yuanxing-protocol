# 远星协议 · EXO / AI Academy

[Play the game](https://tom0dots.github.io/yuanxing-protocol/)

A science-fiction exploration game with AI learning missions. Anyone can play from the link; no account or invitation is needed.

This repository contains the complete static game release **v90** (`20261107-loading90`), including its models, textures, fonts and bundled asset attribution files.

## Loading improvements in v90

The game prepares the detailed world in short stages with visible progress, instead of rebuilding a fallback world while loading. Models and textures use smaller lossless downloads, with original files retained for compatibility. Model detail, texture resolution, vegetation and quality settings remain unchanged.

The final local startup check reached the world in 12.3 seconds (previously 30.2 seconds), with the longest main-thread pause reduced from 8.23 to 0.84 seconds. Actual loading time depends on device and connection.

## Run locally

Run `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000/ .

## Publish an update

Replace `dist/` with the next validated game build and push to `main`. The included GitHub Actions workflow deploys `dist/` to GitHub Pages. In Settings → Pages, the publishing source is **GitHub Actions**.

Progress is saved in each player's browser. The GitHub Pages address uses separate saved progress from the [original game address](https://ai-academy-tom.tom0dota.chatgpt.site/).
