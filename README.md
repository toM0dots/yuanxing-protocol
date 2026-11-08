# 远星协议 · EXO / AI Academy

[Play the game](https://tom0dots.github.io/yuanxing-protocol/)

A science-fiction exploration game with AI learning missions. Anyone can play from the link; no account or invitation is needed.

This repository contains the complete static game release **v92** (`20261108-inspection92b`), including its models, textures, fonts and bundled asset attribution files.

## Combat and presentation in v92

Targets now distinguish detection, obstruction and actual firing range. Use **T** / **换目标** to switch targets. Optional aim assistance, automatic combat framing and a distance slider are available in Settings; the mouse wheel also adjusts distance. Branches close to the camera fade to keep the pilot visible.

Enemy hits now produce directional flinches, guarded stagger and a visible collapse. The existing detailed hero has clearer material contrast, slope-aligned feet, turning steps and more weight in movement and recoil. Enemy armor and windups are easier to read against the ground.

An abandoned maintenance stop on the existing freight road provides a compact encounter with clear escape lanes, outcrops, a damaged cart and scattered equipment. To try it immediately, open **暂停 → 沿途学习 → 想换个玩法？ → 战斗练习**, then choose an enemy. It also exists in the open world. Existing story progress, the v91 route and detailed vegetation remain intact.

## Story route in v91

The first act follows the crash valley, broken road, woodland clues, two memory stops, K–09 and its eastern defense approach. Three optional loops hold environmental discoveries and rejoin the main path. The local map highlights the story destination; the wider world stays available in the regional overview.

Major landmarks are farther apart, with wider lamp spacing and natural vegetation transitions. Existing detailed models, textures, startup improvements and browser saves are preserved. This reorganizes the existing first nine playable episodes; it does not add the planned later chapters.

## Loading improvements in v90

The game prepares the detailed world in short stages with visible progress, instead of rebuilding a fallback world while loading. Models and textures use smaller lossless downloads, with original files retained for compatibility. Model detail, texture resolution, vegetation and quality settings remain unchanged.

The final local startup check reached the world in 12.3 seconds (previously 30.2 seconds), with the longest main-thread pause reduced from 8.23 to 0.84 seconds. Actual loading time depends on device and connection.

## Run locally

Run `python3 -m http.server 8000 --directory dist`, then open http://localhost:8000/ .

## Publish an update

Replace `dist/` with the next validated game build and push to `main`. The included GitHub Actions workflow deploys `dist/` to GitHub Pages. In Settings → Pages, the publishing source is **GitHub Actions**.

Progress is saved in each player's browser. The GitHub Pages address uses separate saved progress from the [original game address](https://ai-academy-tom.tom0dota.chatgpt.site/).
