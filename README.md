# 远星协议 · EXO / AI Academy

[Play the game](https://tom0dots.github.io/yuanxing-protocol/)

A science-fiction exploration game with AI learning missions. Anyone can play from the link; no account or invitation is needed.

This repository contains the complete static game release **v89** (`20261107-performance89`), including its models, textures, fonts and bundled asset attribution files.

## Run locally

Run `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000/ .

## Publish an update

Replace `dist/` with the next validated game build and push to `main`. The included GitHub Actions workflow deploys `dist/` to GitHub Pages. In Settings → Pages, the publishing source is **GitHub Actions**.

Progress is saved in each player's browser. The GitHub Pages address uses separate saved progress from the [original game address](https://ai-academy-tom.tom0dota.chatgpt.site/).
