# deigbzypiub — @colton-ai-dean

**Source:** https://www.instagram.com/reel/DeIGbZypIUb/
**Duration:** 49.50s
**Aspect:** 9:16
**Resolution:** 1080x1920
**Studied:** 2026-10-08
**Engagement (at time of study):** 3,971 likes, 5,812 comments

Sample rate: every 3rd frame (effective ~0.67fps) across 99 extracted frames (2fps).

## Hook (0–2s)
Cold open on the bottom-half talking head (black hoodie, office chair, abstract teal/orange painting behind him) with a bold white headline already on screen: "HOW TO HAVE / CLAUDE EDIT VIDEOS" in two centered lines with heavy black stroke. A phrase-chunk caption ("Claude can fully edit") appears immediately under the headline, synced to his first words. No slow build — the thesis of the video is stated in the first frame.

## Pacing
- Total scenes (graphic overlay changes): ~18-20 over 49.5s
- Average scene length: ~2.5s
- Shortest / longest: ~1.5s (quick stat reveals) / ~6s (numbered step segments like "01 Install it")
- Distribution feel: steady/sustained — not a chopped hype edit. Each UI-mockup graphic holds just long enough to read, then swaps.
- No real pace acceleration/deceleration — it's a flat, explainer cadence throughout, built for clarity over energy.

## Captions
- Style: phrase-chunk (2-5 words per caption card), not strict word-by-word karaoke
- Font feel: bold rounded sans, white fill, thick black outline/drop-shadow for contrast on any background
- Active-word treatment: key phrases get an underline instead of a color pop (e.g. "Not editing anything.", "More specific. Better.")
- Position: centered, roughly at chest/shoulder height of the speaker (just below the headline graphics)
- Size: medium — readable but doesn't dominate the frame

## Scene types
1. Hook — headline + talking head
2. GitHub repo screenshot card ("HyperFrames" / github.com/heygen-com/hyperframes) floating upper-left
3. "HEYGEN-COM" badge + "OPEN SOURCE" + "FREE" tag stack (shallow depth-of-field push)
4. "Claude builds the edit" — mock timeline UI: ANIMATIONS row of diamonds + CLIPS row of filmstrip chips
5. Waveform graphic with "DEAD" labels over silent gaps ("Cuts the dead space")
6. "This entire video" + crossed-out cursor icon + "EDITS BY ME: 0" stat counter
7. File card "IMG_2012.MOV · 3:23 RAW" piping into the Hyperframes logo ("Raw in. Edit out.")
8. Numbered step card "01 Install it" — GitHub URL chip feeding into a simulated Claude chat input, text typing in live, "INSTALLED" checkmark + progress bar
9. Whisper/OpenAI logo + waveform + live transcript lines ("Transcribes every word")
10. Numbered step card "02 Cut it" — raw duration counter (3:14 RAW) ticking down with clip thumbnails, some grayed out as cut
11. "Every retake, gone" — RETAKE/MISTAKE labeled squares getting X'd out one by one, counter ticking down (0:51 RAW)
12. Numbered step card "03 Explain the edit" — simulated chat input "How do you want it edited?" typed live
13. Dashed placeholder box "ANIMATIONS GO HERE" with a down-chevron — shows where Claude will insert graphics
14. Floating example-prompt pill stack ("Captions on every word", "Cut it to 30 seconds", "Zoom in on the logo", "Make the titles bigger") — "Say whatever you want ... it's going to do it"
15. "Detail in, quality out" — two labeled progress bars (DETAIL IN / QUALITY OUT) both fully filled, small picture-in-picture of the raw clip
16. Numbered step card "04 Last step" — horizontal filmstrip of near-identical face-cam thumbnails, one tilted/highlighted
17. "Screenshot every frame" — filmstrip + "1,484 FRAMES" counter
18. "Fix what looks off" — same filmstrip, one frame tagged "✓ FIXED"
19. Render progress bar completing ("Then it renders")
20. "Same ask every time?" — repeat icon with "×1" counter next to a saved-prompt chip ("Cut the dead space, animate above me") → "Make it a skill" — SKILL.md file card labeled "/edit-video-animations"
21. Outro summary grid — "The full breakdown" with four labeled quadrants: 01 Install / 02 Cut / 03 Explain / 04 Check frames
22. CTA outro — "Comment AI" with a simulated comment-input box

## Transitions
- Flavors observed: hard content swaps (no shader/wipe transitions) — the background stays the same static shot of the speaker; only the floating UI-graphic layer changes
- Rotation cadence: no rotating transition effect at all — this creator's signature is that transitions live entirely in the graphic-overlay layer, not in cuts or wipes
- No whip-pans, no glitch, no zooms between scenes

## Face treatment
- Mode: bottom-half talking head, consistently centered-left in frame, same static shot for the entire video (single continuous take, or seamlessly matched cuts)
- Grading: neutral/natural, slightly warm skin tones, flat office lighting
- No Ken Burns / camera motion — the "camera" never moves; all motion is in the graphics layer and the speaker's own hand gestures
- Framing: identical headroom and crop throughout — graphics are composited into the top ~60% of frame above his head

## Audio reactivity
- Text pulses on beat: no
- Background reactivity: no
- This is a pure voiceover-sync edit — graphics timed to words/phrases, not to music or beat

## Palette
- `#FFFFFF` — caption/headline text (white fill)
- `#000000` — text outlines/shadows, hoodie
- `#2A2A2E` (approx) — dark translucent UI-card backgrounds (file cards, chat input mockups)
- `#D96A3C` (approx, muted terracotta/orange) — Hyperframes logo accent, GitHub-adjacent accent chips
- Abstract teal/cream painting behind speaker acts as the only "colorful" background element; everything else is white/black/gray UI chrome

## Signature move
Simulates a full screen-recording/tutorial walkthrough — chat inputs typing live, progress bars filling, file cards, counters — entirely as composited graphics over a static talking-head shot, so the video *reads* like a product demo without ever actually screen-recording anything.

## What to steal (actionable for Hyperframes builds)
- **Simulated UI mockups as B-roll**: build small HTML/CSS "fake app" snippets (chat input, progress bar, file card, step counter) as registry-block-style components that live above a bottom-half face-cam — much cheaper than real screen capture and fully scriptable/on-brand.
- **Numbered step-card system**: a reusable "01 / 02 / 03" label block (small eyebrow number + title) to structure any process/tutorial video — maps well to a simple text + underline animation.
- **Underline-for-emphasis caption treatment**: instead of color-pop on keywords, animate an underline sweeping under 1-3 key words per caption card — distinct from the more common scale-pop/color-swap pattern.
- **Progress-bar / counter motifs** (frames processed, retakes removed, install progress) as a lightweight way to visualize "work happening" without real footage.

## What's creator-specific (don't copy literally)
- The Hyperframes/HeyGen/GitHub branding, repo name, and specific product UI mockups (these are specific to this tool, not transferable)
- His exact handle, face, voice, and office/art-print backdrop
- "Comment AI" CTA — tied to his specific lead-gen funnel

## Transcript
See `transcript.json` in this folder.
