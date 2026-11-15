# Dad & Daughter: project notes

Handoff notes for any model or person picking this project up. Everything here was decided or learned in the first working sessions (November 2026).

## The channel

A YouTube channel called **"Dad, how does it work?"**, where a dad explains complicated everyday things to his five-year-old daughter in very simple terms. (Earlier working titles, "Dad & Daughter Explain" and "But Why, Dad?", are retired.)

Decisions the owner has made:

- **Animated, not live action.** Plain stick figures.
- **Both characters are fictional and scripted.** The owner's real daughter is not five and is not involved. Do not present the daughter as a real child.
- **AI voices** from ElevenLabs for both characters.
- **Look B, "one colour each".** Dad has dark hair and a blue tie. Daughter has an orange dress and an orange bow. Black ink for everything else.
- **Drawn on white wrinkled paper.** The characters must look drawn *into* the paper, not placed on top of it: lines bend over the creases, the ink is grainy, and the crease shading falls on the ink too. The owner rejected a version where clean lines sat on a paper texture.
- **Ink should be strong black**, not grey. The owner asked for it to be darkened once already.
- **The daughter asks the viewer's questions.** The script is a two-person conversation, and she also turns to the viewer directly.
- **Close-up on to-viewer lines.** When either character talks to the viewer, the camera pushes in so only that character is in frame.

Audience: aim at adults and families, not at children. A cartoon with a child's voice risks YouTube's "made for kids" label, which removes comments, notifications and personalised ads. Titles, topics and humour should clearly address grown-ups.

## Writing rules for scripts

- One question per episode, about three and a half minutes.
- The daughter must improve the explanation, not decorate it. She asks what the viewer is too embarrassed to ask, catches jargon, makes the wrong guess most adults would make, and explains the idea back at the end.
- Every episode ends with her explaining it back in her own words.
- Explanations must stay true when simplified. Example from the pilot: "the router has to share its blinks between all of us" was chosen over "it can only talk to one of us at a time", because the second is wrong for modern routers.
- Mark to-viewer lines clearly; they drive the close-up.

The pilot is `scripts/wifi-pilot.md` ("How does Wi-Fi work?"). Its core image: the router is a lamp shining invisible light, blinking a code very fast, and walls soak the light up.

## Topic research so far

YouTube search estimates from vidIQ (monthly searches, competition 0–100 where lower is easier):

| Topic | Searches | Competition |
|---|---|---|
| How does AI work | 63,000 | 46 |
| How does Wi-Fi work | 36,000 | 35 |
| How does the US government work | 36,000 | 30 |
| How does the stock market work | 32,000 | 39 |
| How does Costco make money | 29,000 | 41 |
| How does anesthesia work | 29,000 | 51 |
| How does the internet work | 26,000 | 53 |
| How does the Burj Khalifa get water to the 163rd floor | 21,000 | 30 |
| How does an air fryer work | 19,000 | 30 |
| How does GPS work | 18,500 | 42 |

Planned first batch after Wi-Fi: AI, inflation ("why does everything cost more?"), water reaching the top of a tall building, air fryer.

AI-made animated explainer channels are multiplying fast (searches for "animated explainer shorts" and similar were up several hundred percent in a month). Topic choice alone will not set this channel apart; the two characters and the writing have to.

## Files

| Path | What it is |
|---|---|
| `character-concepts.html` | Character sheet: three looks, her four faces, a sample frame, with a wrinkled/plain switch. Published as an artifact. |
| `scripts/wifi-pilot.md` | Full pilot script. |
| `video/lines.json` | Cold-open lines: speaker, text sent to the voice model (with tags), text shown on screen, and whether it is a to-viewer line. |
| `video/voices.js` | Voices the whole scene in one ElevenLabs dialogue call and cuts it into one clip per line. Also makes dad-voice auditions. |
| `video/envelope.js` | Measures loudness per video frame; drives the mouths and the clip trimming. |
| `video/audio/take.mp3`, `take.json` | The full dialogue take and where each line sits in it. |
| `video/audio/<id>.mp3` | One clip per line, trimmed to the speech. |
| `video/common.js` | Shared by every scene: the two characters, speech bubbles (long lines turn over two lines at a time, on the spoken word), the close-up, `wordTime()`, and `renderFrame()`. Change the characters here, once. |
| `video/cold-open.html` | Scene 1 (cold open). Defines `setup(lines, opts)` and `scene(t)`. |
| `video/invisible-light.html`, `video/lines-invisible-light.json` | Scene 2, "Invisible light": a drawing board between the two shows the ghost, lamp, router = lamp, crossed-out eye, radio waves and car, the flashlight blinking on each spoken "on"/"off", a blink counter, the tablet's tiny receiver, and the cartoon turning into blue dots. |
| `video/audio/<scene>.flac`, `<scene>.json` | The owner's recording for a scene, and each line's start, end and per-word times in it. |
| `video/invisible-light-480p.mp4` | Scene 2 rendered, about 61 seconds. |
| `video/cartoon-and-stuck.html`, `video/lines-cartoon-and-stuck.json`, `video/cartoon-and-stuck-480p.mp4` | Scenes 3 and 4 ("Where the cartoon lives" and "Why it gets stuck"), one recording, about 65 seconds: the cable's journey scrolling past wall, street, ocean and giant computer as each is named; the round trip of the request and the cartoon pieces; an eye that blinks on "blink"; a floor plan where the rings weaken at each wall; a lamp whose light is cut off when the door shuts. |
| `video/final.html`, `video/lines-final.json`, `video/final-480p.mp4` | Scenes 5 and 6 ("Two quick ones" and "She explains it back"), about 54 seconds: the router sharing blinks among the family's gadgets (more join on "more people"); our house and the neighbors', with a padlock and scrambled symbols on "password"; her recap drawn picture by picture as she says it, ticked on "actually right"; the ocean cable and "Next time!". |
| `video/wifi-episode-480p.mp4` | The whole pilot episode, all sections joined: 3 min 18 s. Rebuild with the ffmpeg `concat` filter over the four section MP4s in order (cold-open, invisible-light, cartoon-and-stuck, final). |
| `youtube/thumbnail.html`, `youtube/thumbnail-a.png`, `youtube/thumbnail-b.png`, `youtube/wifi-upload.md` | Thumbnails drawn with the show's own characters and paper (1280×720; `?v=a` / `?v=b`), and the episode's title, description with chapters, tags and upload settings. |
| `youtube/channel-picture.html`, `youtube/channel-picture.png`, `youtube/channel-picture-ring.png` (`?ring=1`, an ink ring so it stands out on white pages), `youtube/channel.md` | Channel picture (the two faces and a blue "?" on the paper, 800×800, made to read as a small circle) and the channel description. The owner says they started the channel for their daughter to learn new things in a fun, interactive way; the cartoon daughter is still a fictional character. |
| `youtube/channel-banner.html`, `youtube/channel-banner.png` | Channel banner, 2560×1440. YouTube shows every device only the middle strip (2560×423) and phones only its centre (1546×423), so the name and the two faces sit in that centre and the router and lamp doodles at the strip's ends. |
| `video/render.js` | Renders every frame in headless Chromium, mixes the audio, encodes the MP4. `--track <file>` uses one outside recording instead of the per-line clips. |
| `video/import-audio.js` | Brings in a recording made elsewhere and finds each line's timing in it. |
| `video/cold-open-480p.mp4` | Current result: about 26 seconds, 854×480, 24 fps, with voices. |

## How the video is made

1. `node video/voices.js` sends every line in `lines.json` to ElevenLabs' `text-to-dialogue/with-timestamps` endpoint in one request. Each line is a separate input with its own voice, so the model performs it as one conversation. The response gives the start and end of every line (`voice_segments`); the take is cut there, and each clip is trimmed to its speech (2 frames before the first open-mouth frame, 5 after the last). `node video/voices.js --recut` re-cuts the saved take without a new API call.
2. `render.js` reads each clip's length and loudness envelope, and `setup()` in `cold-open.html` places every line and action on the clock from those lengths. The picture always follows the audio, so a new take never needs manual re-timing.
3. Mouths open by the loudness of the voice at that exact frame (`mouthLevel()`), so lips move with syllables and close in pauses. Speech bubbles pop at the start of each clip, which is when the speech starts.
4. Each frame is screenshotted, then ffmpeg delays each clip to its start time, mixes them and muxes the MP4.

**Using a recording the owner made elsewhere (the normal way now).** The owner voices each section themselves and sends one file per section. `node video/import-audio.js <file> --lines lines-<scene>.json --out <scene>` saves it as `video/audio/<scene>.flac` and writes `<scene>.json` with every line's start and end and every word's time, found by transcribing the file (ElevenLabs `scribe_v1`) and aligning those words with the script's words. Then render with `--scene <scene>.html --lines lines-<scene>.json --track video/audio/<scene>.flac`: the recording plays untouched from the first frame, and the animation keeps its timing, fitting the walk-in, router, close-up and title around the lines (`fitToTrack()` in `cold-open.html`). Mouths are driven from that recording's loudness, line by line. Do not re-space or re-cut an owner's recording.

For YouTube, render at 1080p with `--height 1080` (1920×1080). It is about 5× slower (roughly 5 minutes per 25 seconds of video on one core), so render the sections in parallel and then join them. 1080p files are not committed (see `.gitignore`); send them to the owner as files.

Render commands (the font comes from the npm package `@fontsource/patrick-hand`; ffmpeg and Playwright must be installed):

```bash
node video/render.js <path>/patrick-hand-latin-400-normal.woff2 <frames-dir> video/cold-open-480p.mp4
```

```bash
node video/render.js <path>/patrick-hand-latin-400-normal.woff2 <stills-dir> --stills 1.5,7.5,16.2,28.5
```

A full 30-second render takes about a minute and a half. Render stills first and look at them before a full render.

### The paper effect

One SVG filter does everything, applied to the whole stage:

- a low-frequency turbulence layer is the crease map;
- the drawing is displaced by the crease map, so lines bend over creases;
- a fine noise layer roughens edges and lightens ink in patches, like crayon;
- diffuse lighting from the same crease map is blended over the result with hard-light, so shadows and highlights hit paper and ink alike.

The crease seed never changes, so the paper holds still. The fine-grain seed cycles every three frames, which makes the lines shimmer slightly as if redrawn. Poses update twelve times a second ("on twos").

Things that went wrong and should not be repeated:

- A paper texture laid over clean vector lines looks fake. The drawing must go through the same filter as the paper.
- `mix-blend-mode: multiply` combined with a CSS `transform` flip rendered solid black in Chromium.
- Displacement pulls transparent pixels in at the edges and leaves a dark smudge. The filter floods white underneath before lighting to prevent it.
- In a close-up the strokes scale up with the camera. They are thinned through a CSS variable (`--k`) so they end up only moderately bolder.

### Voices

- Daughter: ElevenLabs voice "Bonnie", id `5IB29Bdix2wYPY3mVRaK` (cloned voice). The owner is happy with it.
- Dad: ElevenLabs voice "Chris – Charming, Down-to-Earth", id `iP95p4xoKVk53GoZ742B`, chosen provisionally. The owner rejected "Robert" (`8Gy3iEFLvSNCApni00Yl`, cloned) as too robotic. Other candidates auditioned: Roger, Will, Eric, Brian (ids in `voices.js`). To swap, change `VOICES.dad` in `voices.js` and run it.
- Model `eleven_v3`. It acts on bracketed tags such as `[frustrated]`, `[shouting]`, `[deadpan]`, `[gasps]` and does not read them aloud. Older models would speak the tags.
- Generate the scene as one dialogue, never one request per line. Lines generated in isolation sound flat and disconnected; that was part of why the first version sounded robotic.
- Each line in the take begins with a natural pause of up to a second (sometimes with a breath). Trim it, otherwise the speech bubble appears before the character speaks. A fixed dB threshold missed the breaths; trimming by the same relative loudness that drives the mouths works.
- The API key is stored as a network secret on the cloud environment and injected by the proxy; scripts send the placeholder `proxy-injected`. Never ask for the key in chat or put it in a file.
- The key can do text-to-speech and speech-to-text, but lacks permission to list models or read the subscription.
- To verify audio without listening: extract the soundtrack and send it to `/v1/speech-to-text` (`scribe_v1`), then compare the transcript with the script.

## Environment notes

- Cloud sessions for this repo use a personal environment named `dad-daughter`. It allows `trends.google.com` and `suggestqueries.google.com`, and holds the ElevenLabs secret.
- Even with those hosts allowed, requests to Google Trends and Google autocomplete were refused by the session's automatic permission check. Google's own search data has not been obtained; if it is wanted, the owner needs to fetch it or explicitly allow it.
- The vidIQ account was down to 1 credit at last use; most of its tools cost 5.
- Work goes on branch `claude/elegant-einstein-aj9y6g`. No pull request has been requested.

## How the owner works

- Prefers to try things and react: "let's give it a go and see how it goes". Show a result, then adjust.
- Gives short visual feedback ("add a bit more black"). Apply it across every drawing, not only the one mentioned.
- Wants the dad expressive "here and there", not only the daughter. `dad()` in `common.js` takes `face` (smile, grin, laugh, proud, brows, think, surprised, wink), `arm` (rest, talk, point, up, chin, shrug), `left` (rest, shrug, hip), `tilt` and `nod`. Each scene sets them at particular words with `poseAt([...windows])`. Laughs found in the recording (`laughs('dad')`, `laughs('kid')`) switch on the laughing face automatically; a laugh inside one of her lines is hers. Give him a reaction on most of her lines and on key words of his own.
- Wants to see things as drawings and video, not descriptions.

## Open items

- The owner now makes the audio themselves (cold open sped up to 1.11×) and sends it as a file; use `import-audio.js` and `render.js --track`. The owner approved the cold open made this way. The ElevenLabs pipeline in `voices.js` is a fallback.
- All sections of the Wi-Fi pilot are animated and joined into `video/wifi-episode-480p.mp4`. The owner's recordings are all at 1.11× speed (the first part 2+3 file was 1×; it was replaced). For each: write `lines-<scene>.json` from `scripts/wifi-pilot.md`, import the recording, build `<scene>.html` on `common.js` (copy the head of an existing scene), check stills, render.
- Keep her bubble lines short (two short lines): long kid bubbles overlap the drawing board.
- Whether to keep speech bubbles in wide shots now that there are voices.
- The daughter character has no name; the dad calls her nothing specific in the script.
