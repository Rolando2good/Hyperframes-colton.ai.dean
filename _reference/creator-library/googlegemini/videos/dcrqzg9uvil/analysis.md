# dcrqzg9uvil — @googlegemini

**Source:** https://www.instagram.com/reel/DcRQzG9uViL/
**Duration:** 55.38s
**Aspect:** 9:16
**Resolution:** 1080x1920
**Studied:** 2026-10-08
**Engagement (at time of study):** 11,193 likes, 258 comments

Sample rate: every 3rd frame (effective ~0.67fps) across 111 extracted frames (2fps).

## Hook (0–2s)
Cold open on a student (striped top, headband, phone-selfie framing against a beige bedroom/closet-door background) mid-sentence: "If you've got the study scaries about next semester..." A bold white headline ("about next semester...") pops in under her as she finishes the line — text arrives a beat *after* the spoken word lands, not before. No logo or branding yet; reads as a peer testimonial, not an ad.

## Pacing
- Total scenes: ~16-18 over 55.4s
- Average scene length: ~3.3s, but highly uneven — short title-card beats (~1.5s) alternate with long screen-recorded demo holds (6-10s) where the viewer needs time to read real UI
- Shortest / longest: ~1.5s (section title cards) / ~10s (quiz demo, DNA 3D model demo)
- Distribution feel: front-loaded with talking-head setup, then settles into a steady rhythm of [title card → screen-record demo → talking-head transition] repeated per feature (Student Hub → Guided Learning/quizzes → interactive visualizations → Gemini Live → student-plan offer)

## Captions
- Style: phrase-chunk, two distinct treatments used for different purposes:
  1. **Spoken captions**: dark gray/charcoal rounded-rectangle pill background, white text, centered — used throughout wherever she's talking over any footage
  2. **Section headlines**: bold white rounded sans-serif, two stacked lines, no background box (just implicit contrast against the shot) — used only as segment dividers ("Gemini Student Hub", "Study notebooks", "Interactive visualizations", "Gemini Live")
- Active-word treatment: none — no color pop or underline, treatment is uniform
- Position: centered, roughly chest-height on the talking-head shots; overlapping the bottom of the screen-recording on demo shots
- Size: medium for captions, large/bold for section headlines

## Scene types
1. Hook — talking-head testimonial opening mid-sentence
2. Section title "Gemini Student Hub" over talking-head
3. Real screen-recording: Gemini app sidebar (Chat/Spark, New chat, Daily brief, Students, Notebooks list) with a cursor-pointer icon animating clicks — speaker's face composited as a bottom-right bust overlay on top of the screen recording
4. Real screen-recording: Gemini homepage ("Level up your studying" cards, study notebooks list: Biology/math/physics)
5. Section title "Study notebooks" over talking-head
6. Real screen-recording: "What are you working on?" input flow, typing "econ 110", selecting Organize-your-ideas vs. Study-and-learn
7. Real screen-recording: chat compose with an uploaded "Econ 110 lecture notes" file chip, typed prompt requesting a midterm quiz
8. Real screen-recording: generated 15-question practice quiz UI (multiple choice, progress bar, pink/blue right-wrong counters) with cursor clicking through
9. Real screen-recording: "Review what you've learned" follow-up-lesson card + numbered step-by-step worked solution (opportunity cost example)
10. Section title "Interactive visualizations" over talking-head
11. Real screen-recording: typed prompt "Show me how a DNA structure works in 3D", Gemini's text response streaming in
12. Real screen-recording: fully interactive 3D DNA double-helix widget (rotating, with Visualization Mode dropdown — Ball and Stick / Space Filling / Ribbon/Ladder, an Unzip Distance slider, Show Hydrogen Bonds toggle) — cursor animates selecting dropdown options
13. Section title "Gemini Live" over talking-head
14. Real screen-recording: live phone-call-style voice UI (dark navy card, waveform/orb, italicized live transcript) — she asks Gemini Live in Spanish practice mode, with a "Tap to interrupt" + live translated response overlay
15. Talking-head wrap-up: "And you can do all of this with a Gemini student plan"
16. Promo title card "Higher Usage Limits / More Storage" (then "... / Omni Video Generations" added) over talking-head, with small-print legal disclaimer burned in at the bottom ("For eligible students. Offer ends 12/31. Terms apply.")
17. Outro — "Study smarter guys." direct-address sign-off, talking-head only, no further graphics

## Transitions
- Flavors observed: hard cuts only — no wipes, shaders, or whip-pans
- Rotation cadence: none; the only "transition" is the alternation between full-frame talking-head and screen-recording-with-PiP-face
- No camera motion simulated; screen recordings use real native scroll/tap motion, not added effects

## Face treatment
- Mode mix: two modes used deliberately —
  - **Full-frame talking-head** for hooks, section titles, and the outro (bust shot, centered, same static phone-selfie framing throughout)
  - **Bottom picture-in-picture** during screen-recording demo segments — her face/shoulders are composited at roughly the bottom-third/bottom-half of frame, overlapping the real estate of the screenshot above, not in a clean bordered box (no PiP frame/border — it reads like she's just standing in front of a transparent app screen)
- Grading: warm, slightly soft/consumer-camera skin tones; no stylized color grade
- No Ken Burns; static framing throughout

## Audio reactivity
- Text pulses on beat: no
- Background reactivity: no
- Pure voiceover-sync; title cards and captions appear tied to speech timing, not music

## Palette
- `#FFFFFF` — section-title text, UI chrome backgrounds
- `#2E2E33` (approx) — caption pill background
- `#F5E6CE` (approx, warm cream/beige) — bedroom wall/closet-door background behind talking-head shots
- `#A9A6D4` (approx, lavender-gray stripe) — her shirt
- `#1A73E8`-ish Google blue — used sparingly inside the real Gemini app UI (icons, progress accents), not a designed brand choice by the editor
- Navy/near-black — Gemini Live voice-call overlay card

## Signature move
Real, authentic screen-recorded product walkthroughs (not simulated mockups) with the presenter's own face composited directly over the bottom of the live app footage as an un-bordered picture-in-picture — makes native app demos feel personal/testimonial rather than like a dry screen capture.

## What to steal (actionable for Hyperframes builds)
- **Un-bordered bottom PiP over real/simulated screen content**: instead of a bordered picture-in-picture box, let the face-cam bleed directly against the transparent/white background of a UI mockup or screen-recording — feels more integrated than a hard-edged PiP frame.
- **Two-tier caption system**: reserve the bold no-background headline treatment strictly for section dividers, and a pill-background caption for all spoken narration — gives the viewer a clear visual cue for "new topic starting" vs. "still explaining."
- **Cursor-pointer-icon demo convention**: an animated hand/pointer icon highlighting exactly where to look in a dense UI screenshot — directly portable to Hyperframes' `app-showcase` / `ui-3d-reveal` registry blocks.
- **Delayed caption-after-speech micro-beat**: letting the headline land a half-beat after the spoken line finishes (rather than simultaneously) reads as more natural/testimonial than hard-synced captions.

## What's creator-specific (don't copy literally)
- Google/Gemini branding, UI, exact product features, and the "student plan" promo/legal disclaimer
- Her bedroom backdrop, outfit, and specific phrasing ("Study smarter guys")
- This is an official brand account, not an independent creator — tone is closer to a sponsored testimonial than organic content

## Transcript
See `transcript.json` in this folder.
