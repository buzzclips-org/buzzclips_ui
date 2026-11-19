import type { EditorTool } from "@/lib/editor/tools";

/**
 * SEO landing-page content for /tools/[slug].
 *
 * Every claim here must match what the in-browser editor actually does.
 * Do not add features (AI, auto-captions, transitions, stickers, 4K, GIF
 * export, etc.) that the editor does not support.
 */
export const EDITOR_TOOLS: EditorTool[] = [
  // 1. Trim video
  {
    slug: "trim-video",
    name: "Trim Video",
    h1: "Trim Video Online, Free",
    title: "Trim Video Online Free - No Watermark",
    description:
      "Trim video online for free. Cut the start and end of any clip in your browser, with no upload, no signup and no watermark. Export a clean MP4 in minutes.",
    keywords: [
      "trim video",
      "trim video online",
      "video trimmer",
      "trim mp4",
      "shorten video",
      "cut beginning of video",
    ],
    tagline: "Shorten any clip by trimming the start and end - right in your browser, no upload needed.",
    editorHint: "Drag a clip's left or right edge on the timeline, or type exact start/end times in the Clip tab.",
    preset: { panel: "clip" },
    intro: [
      "Most raw footage has dead air at both ends: the moment you reach for the record button, the fumble to stop it, the few seconds before anything happens. Trimming removes that so the video starts on the action and ends when the point is made.",
      "The BuzzClips trimmer runs entirely in your browser using WebCodecs. Your file is read from your own device and never sent to a server, so trimming a private family clip or an unreleased product demo stays private. There is no account to create and no watermark on the exported MP4.",
      "You can trim visually by dragging the edges of a clip on the timeline, or precisely by typing a start and end time. If you want to stop at an exact frame, park the playhead there and press \"End at playhead\".",
    ],
    steps: [
      {
        name: "Import your video",
        text: "Click \"Import\" or drag an MP4, MOV, WebM or MKV file onto the editor. It appears as a clip on the video track of the timeline.",
      },
      {
        name: "Set the new start",
        text: "Drag the clip's left edge to the right, or move the playhead to where the video should begin and click \"Start at playhead\" in the Clip tab.",
      },
      {
        name: "Set the new end",
        text: "Drag the right edge to the left, or position the playhead and click \"End at playhead\". You can also type start and end times directly for frame-level control.",
      },
      {
        name: "Export the trimmed clip",
        text: "Click \"Export\", wait for the progress bar to finish, preview the result, then click \"Download MP4\".",
      },
    ],
    tips: [
      "Zoom into the timeline before dragging edges so small adjustments are easier to land.",
      "Scrub slowly near the cut point and watch the preview so you don't clip the first word someone says.",
      "Trimming is non-destructive: drag the edge back out at any time to recover footage you removed.",
      "If you need to remove something from the middle instead of the ends, use Split rather than trim.",
    ],
    faqs: [
      {
        question: "Does trimming reduce video quality?",
        answer:
          "The trimmed video is re-encoded on export. Choose 1080p in the Project tab to keep detail close to the original for typical phone footage. The original file on your device is never modified.",
      },
      {
        question: "Is my video uploaded when I trim it?",
        answer:
          "No. Decoding, trimming and encoding all happen in your browser. Nothing leaves your device unless you choose \"Publish to BuzzClips\", which is optional and requires a free account.",
      },
      {
        question: "Can I trim to an exact time?",
        answer:
          "Yes. In the Clip tab you can type the start and end time, or place the playhead and use \"Start at playhead\" and \"End at playhead\".",
      },
      {
        question: "How large a file can I trim?",
        answer:
          "Files up to 4 GB are accepted. Long or very high-resolution files need a lot of memory, so a desktop computer is recommended for those.",
      },
      {
        question: "Will the exported file have a watermark?",
        answer: "No. Exports are free and never watermarked, and you do not need to sign up to download them.",
      },
    ],
    related: ["cut-video", "merge-videos", "change-video-speed"],
  },

  // 2. Cut video
  {
    slug: "cut-video",
    name: "Cut Video",
    h1: "Cut and Split Video Online, Free",
    title: "Cut Video Online Free - Split Into Parts",
    description:
      "Cut video online free: split a clip into parts, delete unwanted sections and keep the best moments. Works in your browser with no upload and no watermark.",
    keywords: [
      "cut video",
      "cut video online",
      "split video",
      "video cutter",
      "remove part of video",
      "split video into parts",
    ],
    tagline: "Split a video at any moment and delete the parts you don't want - no software to install.",
    editorHint: "Move the playhead and press S (or Split) to cut. Select the unwanted piece and press Delete.",
    preset: { panel: "clip" },
    intro: [
      "Trimming only shortens the ends of a clip. Cutting is what you need when the problem is in the middle: a phone call that interrupted a tutorial, a long pause in an interview, or a section you simply don't want anyone to see.",
      "In BuzzClips you cut by splitting. Put the playhead where a section starts, press S, move to where it ends, press S again, and you now have a separate piece you can delete. The remaining pieces close up automatically and play back to back on the video track.",
      "Because splitting is free and instant, you can also use it to break one long recording into several parts, reorder them by dragging, or duplicate a moment to repeat it. Everything runs locally in your browser, so even long recordings stay on your machine.",
    ],
    steps: [
      {
        name: "Import the recording",
        text: "Click \"Import\" and choose your video, or drag and drop it onto the page.",
      },
      {
        name: "Split at the first cut point",
        text: "Play or scrub to the start of the section you want to remove and click \"Split\" (or press S).",
      },
      {
        name: "Split at the second cut point",
        text: "Move the playhead to where the unwanted section ends and split again. The section is now its own clip on the timeline.",
      },
      {
        name: "Delete and tidy up",
        text: "Click the unwanted clip and press Delete. Repeat for other sections, drag pieces to reorder them if needed, then click \"Export\" and \"Download MP4\".",
      },
    ],
    tips: [
      "Make cuts on a pause or between sentences so the jump is less noticeable.",
      "Use undo freely - if a split lands in the wrong place, undo and try again.",
      "A short global fade in and out (Project tab) makes the start and end of a cut-down video feel finished.",
      "To keep a section as its own video, delete everything around it and export just that part.",
    ],
    faqs: [
      {
        question: "What is the difference between cutting and trimming?",
        answer:
          "Trimming shortens a clip from its start or end. Cutting (splitting) divides a clip at the playhead so you can remove or move a section from the middle.",
      },
      {
        question: "Can I split a video into several separate files?",
        answer:
          "Each export produces one MP4 of the whole timeline. To save parts as separate files, export once per part, deleting the other pieces before each export, and use undo to bring them back.",
      },
      {
        question: "Is there a keyboard shortcut for splitting?",
        answer: "Yes. Press S to split the selected clip at the playhead, D to duplicate it and Delete to remove it.",
      },
      {
        question: "Are transitions added between the cut pieces?",
        answer:
          "No. Pieces play back to back as straight cuts. The only fade available is a global fade in and out from black at the very start and end of the video.",
      },
      {
        question: "Do I need to create an account?",
        answer: "No. Cutting and exporting work without signing up, and there is no watermark.",
      },
    ],
    related: ["trim-video", "merge-videos", "mute-video"],
  },

  // 3. Merge videos
  {
    slug: "merge-videos",
    name: "Merge Videos",
    h1: "Merge Videos Online, Free",
    title: "Merge Videos Online Free - Join Clips",
    description:
      "Merge videos online for free. Join clips and photos into one MP4, reorder them on a timeline and export with no watermark. Runs privately in your browser.",
    keywords: [
      "merge videos",
      "join videos",
      "combine videos",
      "video merger",
      "merge mp4 files",
      "combine clips and photos",
    ],
    tagline: "Combine several clips and photos into a single video, in the order you choose.",
    editorHint: "Import all your clips at once, then drag them on the timeline to set the order they play in.",
    preset: { panel: "clip" },
    intro: [
      "Phones split a day of filming into dozens of short files. Merging them gives you one video you can actually share: a trip recap, a match highlight, or a sequence of how-to steps recorded separately.",
      "BuzzClips places every imported clip on a single video track, where they play one after another. You can mix videos from different sources with still photos, drag them into any order, and trim each one before joining. When you export, everything is combined into one MP4 at the aspect ratio and resolution you pick.",
      "Clips recorded in different shapes, such as a vertical phone video next to a horizontal camera clip, are handled by framing. Choose \"Fit (show all)\" to keep the whole picture with bars in your background colour, or \"Fill (crop)\" to fill the frame.",
    ],
    steps: [
      {
        name: "Import all your files",
        text: "Click \"Import\" and select several videos and photos at once, or drag them all onto the editor together.",
      },
      {
        name: "Arrange the order",
        text: "Drag clips left or right on the timeline. They play in sequence from left to right.",
      },
      {
        name: "Match the look",
        text: "Select one clip, set its framing and filter in the Clip tab, then click \"Apply this look & framing to all clips\" so everything matches.",
      },
      {
        name: "Export one combined video",
        text: "Choose the aspect ratio and resolution in the Project tab, click \"Export\" and then \"Download MP4\".",
      },
    ],
    tips: [
      "Pick the project aspect ratio before arranging clips so you can judge framing as you go.",
      "Use \"Mute all clips\" and add background music if the original sounds clash between clips.",
      "Photos default to 3 seconds each; adjust per photo from 0.5 to 30 seconds.",
      "Trim each clip before merging so the joined video doesn't drag.",
    ],
    faqs: [
      {
        question: "Can I merge videos with different resolutions or orientations?",
        answer:
          "Yes. Everything is rendered into the project's aspect ratio and resolution. Each clip can use \"Fit (show all)\" or \"Fill (crop)\" framing to handle the difference.",
      },
      {
        question: "Which formats can I combine?",
        answer:
          "Videos in MP4, MOV, WebM and MKV (depending on what your browser can decode), plus JPG, PNG, WebP and GIF images, which are used as stills.",
      },
      {
        question: "Can I add transitions between merged clips?",
        answer:
          "Clips join with straight cuts. You can add a fade in and out from black at the beginning and end of the whole video in the Project tab.",
      },
      {
        question: "Are my clips uploaded to a server?",
        answer:
          "No. Merging and exporting happen in your browser. Files only leave your device if you choose \"Publish to BuzzClips\".",
      },
      {
        question: "What format is the merged file?",
        answer:
          "An MP4, using H.264 video and AAC audio when your browser supports them. Some browsers, such as Firefox, may use other codecs like Opus for the audio.",
      },
    ],
    related: ["photo-to-video", "cut-video", "add-music-to-video", "trim-video"],
  },

  // 4. Crop video
  {
    slug: "crop-video",
    name: "Crop Video",
    h1: "Crop Video to 9:16, 1:1, 4:5 or 16:9",
    title: "Crop Video Online Free - 9:16, 1:1, 16:9",
    description:
      "Crop video online free to 9:16, 1:1, 4:5 or 16:9. Fill the frame for Reels, TikTok or YouTube with no upload and no watermark, right in your browser.",
    keywords: [
      "crop video",
      "crop video online",
      "crop video to 9:16",
      "crop video square",
      "crop video aspect ratio",
      "video cropper",
    ],
    tagline: "Crop a video to a standard aspect ratio by filling the frame - ideal for vertical and square posts.",
    editorHint: "Pick an aspect ratio in the Project tab, then set the clip's framing to \"Fill (crop)\" in the Clip tab.",
    preset: { aspect: "9:16", panel: "project" },
    intro: [
      "Cropping in BuzzClips is aspect-ratio cropping. You choose the shape of the finished video - vertical 9:16, square 1:1, portrait 4:5 or widescreen 16:9 - and set a clip to \"Fill (crop)\". The clip is scaled to cover the whole frame and centred, and whatever falls outside the frame is cropped away.",
      "To be clear about what this tool is not: there is no free-form rectangle crop, so you cannot draw a custom box around one part of the picture or pan the crop to a corner. If you need to crop out an exact region, a dedicated desktop editor is a better fit. For turning a landscape video into a vertical or square one, centred cropping is usually what you want.",
      "This page starts a new project at 9:16, the shape used by Reels, TikTok and YouTube Shorts. Change it any time in the Project tab. Processing stays in your browser, and the exported MP4 has no watermark.",
    ],
    steps: [
      {
        name: "Import your video",
        text: "Click \"Import\" and choose the video you want to crop.",
      },
      {
        name: "Choose the target shape",
        text: "In the Project tab, pick 9:16, 1:1, 4:5 or 16:9. The preview frame changes shape immediately.",
      },
      {
        name: "Set framing to Fill (crop)",
        text: "Select the clip, open the Clip tab and choose \"Fill (crop)\". The video now covers the frame and the edges outside it are cropped.",
      },
      {
        name: "Export",
        text: "Click \"Export\" and then \"Download MP4\" once the preview looks right.",
      },
    ],
    tips: [
      "Centred cropping works best when the subject is in the middle of the shot - check the preview before exporting.",
      "If important details are cut off, switch to \"Fit (show all)\" to keep the whole picture with bars in your background colour instead.",
      "Going from 16:9 to 9:16 removes a lot of the sides, so footage shot with the subject centred crops best.",
      "Use \"Apply this look & framing to all clips\" to crop every clip the same way in one click.",
    ],
    faqs: [
      {
        question: "Can I drag a custom crop rectangle?",
        answer:
          "No. Cropping works by choosing an aspect ratio and the \"Fill (crop)\" framing, which keeps the centre of the clip. Free-form or off-centre cropping isn't supported.",
      },
      {
        question: "Which aspect ratios can I crop to?",
        answer: "16:9 (widescreen), 9:16 (vertical), 1:1 (square) and 4:5 (portrait).",
      },
      {
        question: "How do I keep the whole video without cropping?",
        answer:
          "Choose \"Fit (show all)\" framing. The full picture is shown and any empty space is filled with the project's background colour.",
      },
      {
        question: "Does cropping lower the resolution?",
        answer:
          "The output is rendered at the resolution you choose (480p, 720p or 1080p). Cropping a landscape clip to vertical enlarges the centre, so very low-resolution sources may look softer.",
      },
      {
        question: "Is the video uploaded?",
        answer: "No. It is processed in your browser and only leaves your device if you choose to publish it to BuzzClips.",
      },
    ],
    related: ["resize-video", "rotate-video", "instagram-reels-editor", "tiktok-video-editor"],
  },

  // 5. Resize video
  {
    slug: "resize-video",
    name: "Resize Video",
    h1: "Resize Video for Instagram, TikTok and YouTube",
    title: "Resize Video Online Free - Any Platform",
    description:
      "Resize video online free. Change aspect ratio and resolution for Instagram, TikTok or YouTube, then download an MP4 with no watermark. No upload needed.",
    keywords: [
      "resize video",
      "resize video online",
      "change video aspect ratio",
      "change video resolution",
      "resize video for instagram",
      "video resizer",
    ],
    tagline: "Change a video's aspect ratio and resolution to suit the platform you're posting on.",
    editorHint: "Set aspect ratio and resolution in the Project tab. Use Fit or Fill framing in the Clip tab.",
    preset: { panel: "project" },
    intro: [
      "Resizing a video usually means two things: changing its shape (aspect ratio) and changing its pixel dimensions (resolution). Each platform favours a different combination, and posting the wrong shape leads to awkward bars or automatic cropping you didn't choose.",
      "In the Project tab you can switch between 16:9, 9:16, 1:1 and 4:5, and output at 480p, 720p or 1080p. At 1080p, a 9:16 project exports at 1080x1920 and a 16:9 project at 1920x1080. Each clip then decides how it fits the new shape: \"Fit (show all)\" adds bars in your chosen background colour, \"Fill (crop)\" covers the frame.",
      "A smaller resolution is also a simple way to make a lighter file for sharing in a chat or email. Everything is processed on your device, so you can resize as many versions as you like without waiting on uploads.",
    ],
    steps: [
      {
        name: "Import the video",
        text: "Click \"Import\" or drag your file onto the editor.",
      },
      {
        name: "Pick the new size",
        text: "Open the Project tab and choose an aspect ratio and a resolution (480p, 720p or 1080p).",
      },
      {
        name: "Decide how it fits",
        text: "In the Clip tab, choose \"Fit (show all)\" to keep everything visible or \"Fill (crop)\" to fill the frame. Change the background colour in the Project tab if you use Fit.",
      },
      {
        name: "Export the resized file",
        text: "Click \"Export\", check the preview and click \"Download MP4\".",
      },
    ],
    tips: [
      "Vertical 9:16 suits Reels, TikTok and Shorts; 16:9 suits standard YouTube; 1:1 or 4:5 suits the Instagram feed.",
      "Use a background colour that matches your brand or the video's tones when using Fit framing.",
      "Exporting a second version is quick - change the aspect ratio and export again to get a copy for another platform.",
      "Choose 720p if you need a smaller file and the video will mostly be watched on phones.",
    ],
    faqs: [
      {
        question: "What resolutions can I export?",
        answer:
          "480p, 720p and 1080p, at 24, 30 or 60 fps. 4K export isn't available.",
      },
      {
        question: "What size is a 1080p vertical video?",
        answer: "A 9:16 project at 1080p exports at 1080x1920 pixels. A 16:9 project at 1080p is 1920x1080.",
      },
      {
        question: "Will resizing stretch my video?",
        answer:
          "No. Clips keep their proportions. They are either fitted inside the frame with bars or scaled to fill it with the edges cropped.",
      },
      {
        question: "Can I make the file size smaller?",
        answer:
          "Exporting at a lower resolution such as 720p or 480p generally produces a smaller file. Trimming unneeded footage helps too.",
      },
      {
        question: "Is resizing really free?",
        answer: "Yes. There's no watermark, no signup and no upload; the work happens in your browser.",
      },
    ],
    related: ["crop-video", "instagram-reels-editor", "youtube-video-editor", "rotate-video"],
  },

  // 6. Rotate video
  {
    slug: "rotate-video",
    name: "Rotate Video",
    h1: "Rotate or Flip a Video Online, Free",
    title: "Rotate Video Online Free - Flip & Mirror",
    description:
      "Rotate video online free by 90, 180 or 270 degrees, or flip and mirror it. Fix sideways phone footage in your browser and export an MP4 with no watermark.",
    keywords: [
      "rotate video",
      "rotate video online",
      "flip video",
      "mirror video",
      "rotate video 90 degrees",
      "fix sideways video",
    ],
    tagline: "Fix sideways or upside-down footage and mirror selfie videos in a couple of clicks.",
    editorHint: "Select the clip, then use the rotate and flip buttons in the Clip tab. Each rotate turns it 90 degrees.",
    preset: { panel: "clip" },
    intro: [
      "A phone that didn't register its orientation, a camera mounted upside down, or a selfie clip where the text reads backwards - all are fixed with rotation or flipping. These are per-clip settings, so you can correct one bad clip without touching the rest of a project.",
      "Rotate turns a clip in 90-degree steps, giving you 90, 180 and 270 degrees. Flip horizontal mirrors it left to right, which is the usual fix for front-camera footage; flip vertical turns it top to bottom. You can combine rotation and flipping on the same clip.",
      "After rotating, a clip may no longer match the project's shape - a sideways landscape clip becomes portrait. Pick the right aspect ratio in the Project tab and choose Fit or Fill framing so the result looks intentional.",
    ],
    steps: [
      {
        name: "Import the clip",
        text: "Click \"Import\" and select the sideways or mirrored video.",
      },
      {
        name: "Rotate it",
        text: "Select the clip on the timeline, open the Clip tab and press rotate until it's upright. Each press turns it 90 degrees.",
      },
      {
        name: "Flip if needed",
        text: "Use flip horizontal to mirror the image, or flip vertical to turn it upside down.",
      },
      {
        name: "Set the shape and export",
        text: "Adjust the aspect ratio in the Project tab if the orientation changed, then click \"Export\" and \"Download MP4\".",
      },
    ],
    tips: [
      "A vertical video that plays sideways usually needs one 90-degree turn; check the preview to see which way.",
      "Mirror front-camera clips so text and logos read correctly.",
      "If you split a clip, rotation applies to each piece individually - set it before splitting to save time.",
      "Rotating a landscape clip into a 9:16 project with \"Fill (crop)\" can make it fill a vertical frame neatly.",
    ],
    faqs: [
      {
        question: "Can I rotate by any angle, like 45 degrees?",
        answer: "No. Rotation works in 90-degree steps: 90, 180 or 270 degrees.",
      },
      {
        question: "What's the difference between rotate and flip?",
        answer:
          "Rotate turns the picture around its centre. Flip mirrors it - horizontally (left/right) or vertically (top/bottom).",
      },
      {
        question: "Can I rotate only one clip in a project?",
        answer: "Yes. Rotation and flip are set per clip, so other clips are unaffected.",
      },
      {
        question: "Does rotating affect the audio?",
        answer: "No. Only the picture is rotated or flipped; the clip's sound is unchanged.",
      },
      {
        question: "Is my video uploaded to rotate it?",
        answer: "No. Rotation is applied in your browser during export, and nothing is uploaded unless you publish to BuzzClips.",
      },
    ],
    related: ["crop-video", "resize-video", "video-filters"],
  },

  // 7. Add text to video
  {
    slug: "add-text-to-video",
    name: "Add Text to Video",
    h1: "Add Text to Video Online, Free",
    title: "Add Text to Video Online Free",
    description:
      "Add text to video online for free. Type titles, captions and calls to action, style and position them, and export an MP4 with no watermark. No upload needed.",
    keywords: [
      "add text to video",
      "text on video",
      "add title to video",
      "add captions to video manually",
      "video text editor",
      "put words on video",
    ],
    tagline: "Type titles, captions and calls to action onto your video and choose exactly when they appear.",
    editorHint: "Add a text overlay in the Text tab, type your words, then drag the text block on the timeline to time it.",
    preset: { panel: "text" },
    intro: [
      "Text makes a video understandable with the sound off and tells viewers what to do next. Common uses are an opening title, a short caption explaining each step, a name label in an interview, or a closing call to action like \"Follow for part 2\".",
      "BuzzClips has a dedicated text track, so overlays sit above your footage and can be timed independently. Add as many as you need, set when each appears and disappears, and style it with a sans, serif or mono font, size, bold, outline, colour and an optional background box. Multi-line text is supported.",
      "Captions are typed by you - there's no automatic speech-to-text. For short videos that's often quicker than correcting machine captions, and you control exactly what is written.",
    ],
    steps: [
      {
        name: "Import your video",
        text: "Click \"Import\" and add the video you want to put text on.",
      },
      {
        name: "Add a text overlay",
        text: "Open the Text tab, add a new text and type your words. Press Enter for multiple lines.",
      },
      {
        name: "Style and position it",
        text: "Pick font, size, colour, bold, outline and background box. Choose top, center or bottom, or drag the text anywhere on the preview.",
      },
      {
        name: "Time it",
        text: "Drag or resize the text block on the text track, or set appear and disappear times. Then click \"Export\" and \"Download MP4\".",
      },
    ],
    tips: [
      "An outline or background box keeps text readable over busy or bright footage.",
      "Keep text away from the very bottom and right edge on vertical videos, where app buttons and captions often sit.",
      "Leave each caption on screen long enough to read it twice.",
      "Use one font and two sizes at most for a clean, consistent look.",
    ],
    faqs: [
      {
        question: "Can BuzzClips generate captions automatically?",
        answer:
          "No. There's no automatic captioning or transcription. You type captions yourself as text overlays and time them on the text track.",
      },
      {
        question: "How many text overlays can I add?",
        answer: "As many as you like. Each has its own timing, style and position.",
      },
      {
        question: "Which fonts are available?",
        answer: "Sans, serif and mono styles, with adjustable size, bold and outline.",
      },
      {
        question: "Can I place text anywhere on the screen?",
        answer:
          "Yes. Use the top, center or bottom presets, or drag the text directly on the preview to any position.",
      },
      {
        question: "Can I animate text?",
        answer:
          "Text appears and disappears at the times you set. Animated text effects and keyframes aren't supported.",
      },
    ],
    related: ["instagram-reels-editor", "youtube-shorts-maker", "add-music-to-video"],
  },

  // 8. Add music to video
  {
    slug: "add-music-to-video",
    name: "Add Music to Video",
    h1: "Add Music to Video Online, Free",
    title: "Add Music to Video Online Free",
    description:
      "Add music to video online free. Drop in an MP3 or WAV, set the volume, start point and loop, and mix it with clip sound. No watermark, nothing uploaded.",
    keywords: [
      "add music to video",
      "add song to video",
      "add background music to video",
      "put music on video",
      "add audio to video",
      "add mp3 to video",
    ],
    tagline: "Lay a song under your video, balance it with the original sound and export one finished MP4.",
    editorHint: "Import an audio file and it lands on the music track. Set volume, start and loop in the Audio tab.",
    preset: { panel: "audio" },
    intro: [
      "A soundtrack sets the mood and covers wind noise or silence. BuzzClips gives each project one background music track that sits under your clips, and on export the music and the clips' own audio are mixed into a single soundtrack.",
      "You control how the song fits: set its volume, choose where on the timeline it starts, skip into the song so it begins at the chorus instead of the intro, and turn on looping if the track is shorter than your video. Each clip also has its own volume and mute, so you can keep a voice audible over the music or silence a noisy clip.",
      "You bring the music - MP3, WAV, M4A, AAC, OGG or FLAC files from your device. Make sure you have the rights to use the song where you plan to post it.",
    ],
    steps: [
      {
        name: "Import video and music",
        text: "Click \"Import\" and add your video clips and an audio file. The audio goes on the music track.",
      },
      {
        name: "Position the song",
        text: "In the Audio tab, set the start offset on the timeline and how far to skip into the song.",
      },
      {
        name: "Balance the volume",
        text: "Lower the music volume if people are speaking, or lower or mute clip volume in the Clip tab to let the music lead.",
      },
      {
        name: "Loop and export",
        text: "Turn on loop if the song is shorter than the video, add a fade out in the Project tab if you like, then \"Export\" and \"Download MP4\".",
      },
    ],
    tips: [
      "Skip into the song to start on a strong beat rather than a slow intro.",
      "Around 20-40% music volume usually sits well under speech; adjust by ear.",
      "A fade out from the Project tab ends the music smoothly instead of cutting mid-bar.",
      "Make cuts on the beat of the song for an edit that feels deliberate.",
    ],
    faqs: [
      {
        question: "Which audio formats can I add?",
        answer: "MP3, WAV, M4A, AAC, OGG and FLAC, subject to your browser's support.",
      },
      {
        question: "Can I add more than one song?",
        answer:
          "Each project has one music track holding one song. To use several songs, combine them into one audio file first.",
      },
      {
        question: "Will the original video sound be kept?",
        answer:
          "Yes, unless you mute it. Clip audio and music are mixed together, and you can set each clip's volume from 0 to 100%.",
      },
      {
        question: "Does BuzzClips provide a music library?",
        answer: "No. You use audio files from your own device.",
      },
      {
        question: "Can I record a voiceover?",
        answer:
          "Voiceover recording isn't built in. You can import a voice recording as the music track, or record it as part of a video clip.",
      },
    ],
    related: ["mute-video", "photo-to-video", "add-text-to-video", "merge-videos"],
  },

  // 9. Change video speed
  {
    slug: "change-video-speed",
    name: "Change Video Speed",
    h1: "Change Video Speed Online - Speed Up or Slow Motion",
    title: "Change Video Speed Online Free",
    description:
      "Change video speed online free. Speed up clips up to 4x or make slow motion down to 0.25x, per clip, in your browser. Export an MP4 with no watermark.",
    keywords: [
      "change video speed",
      "speed up video",
      "slow motion video",
      "video speed changer",
      "slow down video online",
      "fast forward video",
    ],
    tagline: "Speed up a long process or slow down a key moment, from 0.25x to 4x, clip by clip.",
    editorHint: "Select a clip and set its speed in the Clip tab. Split first if only part of it should change speed.",
    preset: { panel: "clip" },
    intro: [
      "Speeding up turns a ten-minute recipe or a sunset into something people will watch to the end. Slowing down lets viewers see a trick, a splash or a goal that happens too fast at normal speed.",
      "Speed is set per clip, anywhere from 0.25x (quarter speed) to 4x. To change speed for just one moment, split the clip before and after it and adjust only that piece - the rest keeps playing at normal speed. The timeline updates to show the new clip length.",
      "Audio follows the speed change the way a tape would: faster clips sound higher-pitched and slower ones lower. If that isn't what you want, mute the clip or use \"Mute all clips\" and add background music instead.",
    ],
    steps: [
      {
        name: "Import your video",
        text: "Click \"Import\" and add the clip.",
      },
      {
        name: "Isolate the section",
        text: "If only part should change, move the playhead and press \"Split\" (S) at the start and end of that part.",
      },
      {
        name: "Set the speed",
        text: "Select the clip or piece and choose a speed between 0.25x and 4x in the Clip tab.",
      },
      {
        name: "Handle the sound and export",
        text: "Mute the clip if the pitched audio is distracting, add music in the Audio tab if you want, then \"Export\" and \"Download MP4\".",
      },
    ],
    tips: [
      "Slow motion looks smoothest from footage shot at a high frame rate, such as 60 fps.",
      "Export at 60 fps in the Project tab when your source is 60 fps, so fast motion stays fluid.",
      "Use 2x to 4x for long processes like cooking, cleaning or drawing.",
      "Ramp the effect by splitting into short pieces with gradually changing speeds.",
    ],
    faqs: [
      {
        question: "What speed range is supported?",
        answer: "From 0.25x (four times slower) to 4x (four times faster), set per clip.",
      },
      {
        question: "Does changing speed change the pitch?",
        answer:
          "Yes. Audio speeds up or slows down with the video, so pitch rises or falls like a tape. Pitch-preserving speed change isn't available.",
      },
      {
        question: "Can I slow down only part of a clip?",
        answer: "Yes. Split the clip around that part and change the speed of the middle piece only.",
      },
      {
        question: "Will slow motion look smooth?",
        answer:
          "Frames are not generated or interpolated, so smoothness depends on the source frame rate. 60 fps footage slows down much more smoothly than 24 or 30 fps footage.",
      },
      {
        question: "Is it free?",
        answer: "Yes. No signup, no watermark, and your video stays in your browser.",
      },
    ],
    related: ["trim-video", "cut-video", "mute-video"],
  },

  // 10. Mute video
  {
    slug: "mute-video",
    name: "Mute Video",
    h1: "Mute Video Online - Remove Audio for Free",
    title: "Mute Video Online Free - Remove Audio",
    description:
      "Mute video online free. Remove audio from one clip or all of them, or replace the sound with music. Private in-browser editing, MP4 export, no watermark.",
    keywords: [
      "mute video",
      "remove audio from video",
      "remove sound from video",
      "silence video",
      "replace audio in video",
      "video without sound",
    ],
    tagline: "Strip the sound from a video, or swap it for music, without uploading the file anywhere.",
    editorHint: "Mute a clip in the Clip tab, or use \"Mute all clips\". Add a song in the Audio tab to replace it.",
    preset: { panel: "audio" },
    intro: [
      "Background chatter, traffic, wind, or a copyrighted song playing in a shop can make otherwise good footage unusable. Muting removes the clip's audio so only the picture remains - or so you can replace it with something better.",
      "Each clip has a mute switch and a volume slider from 0 to 100%, so you can silence one noisy clip and keep the others. To silence the whole video at once, use \"Mute all clips\". The exported MP4 then contains only the sound you choose to keep, or none at all if you add no music.",
      "Replacing audio is just a matter of adding a track to the music lane. Because the work happens in your browser, private recordings never leave your device.",
    ],
    steps: [
      {
        name: "Import your video",
        text: "Click \"Import\" and add the clip or clips.",
      },
      {
        name: "Mute the audio",
        text: "Select a clip and turn on mute in the Clip tab, or click \"Mute all clips\" to silence everything.",
      },
      {
        name: "Add replacement sound (optional)",
        text: "Import an MP3, WAV or other audio file. In the Audio tab, set its volume, start point and loop.",
      },
      {
        name: "Export",
        text: "Click \"Export\" and \"Download MP4\". Preview first to confirm the sound is as you want it.",
      },
    ],
    tips: [
      "Instead of muting completely, try lowering a clip to 10-20% to keep a little natural ambience under music.",
      "Split a clip and mute only the piece with the unwanted noise if the rest sounds fine.",
      "Muting is a good fix for sped-up clips, whose audio otherwise plays back high-pitched.",
    ],
    faqs: [
      {
        question: "Can I mute only part of a video?",
        answer: "Yes. Split the clip around the section and mute just that piece.",
      },
      {
        question: "Can I remove background noise but keep voices?",
        answer:
          "No. Muting removes all of a clip's audio. Noise reduction and voice isolation aren't available.",
      },
      {
        question: "Can I replace the audio with a song?",
        answer:
          "Yes. Mute the clips and import an audio file to the music track. You can loop it until the video ends.",
      },
      {
        question: "Can I extract the audio as an MP3?",
        answer: "No. Exports are MP4 video files. Audio-only export isn't supported.",
      },
      {
        question: "Is my video uploaded?",
        answer: "No. It stays on your device unless you choose to publish to BuzzClips.",
      },
    ],
    related: ["add-music-to-video", "cut-video", "change-video-speed"],
  },

  // 11. Photo to video
  {
    slug: "photo-to-video",
    name: "Photo to Video",
    h1: "Photo to Video - Free Slideshow Maker",
    title: "Photo to Video Maker - Free Slideshow",
    description:
      "Turn photos into a video with music, free. Set each photo's duration, add text and a song, then export an MP4 slideshow in your browser with no watermark.",
    keywords: [
      "photo to video",
      "slideshow maker",
      "photos to video with music",
      "make a video from pictures",
      "picture slideshow",
      "image to video",
    ],
    tagline: "Turn a set of photos into a shareable video slideshow with music and captions.",
    editorHint: "Import your photos, drag them into order, and adjust each photo's duration in the Clip tab.",
    preset: { panel: "clip" },
    intro: [
      "A slideshow video is an easy way to share a holiday, a birthday, a product range or a before-and-after. It plays on any platform that takes video, which a folder of photos does not.",
      "Import JPG, PNG, WebP or GIF images (GIFs are used as a still frame). Each photo starts at 3 seconds on the timeline, and you can change any photo to between 0.5 and 30 seconds. Photos can sit alongside video clips in the same timeline, so you can mix stills and footage freely.",
      "Add one music track to set the pace, text overlays for names, dates or prices, and a fade in and out from black in the Project tab for a polished start and finish. Filters work on photos too, so you can give a whole set a consistent look.",
    ],
    steps: [
      {
        name: "Import your photos",
        text: "Click \"Import\" and select all the images, or drag them onto the editor.",
      },
      {
        name: "Order and time them",
        text: "Drag photos on the timeline to reorder. Select one and set its duration (0.5-30 s) in the Clip tab.",
      },
      {
        name: "Add music and text",
        text: "Import a song for the Audio tab's music track and add captions in the Text tab.",
      },
      {
        name: "Export the slideshow",
        text: "Choose an aspect ratio in the Project tab, then \"Export\" and \"Download MP4\".",
      },
    ],
    tips: [
      "Use \"Fill (crop)\" so photos of different shapes fill the frame, or \"Fit (show all)\" to show every photo uncropped.",
      "Shorter durations (1-2 s) feel energetic; longer ones (4-6 s) give viewers time to look.",
      "Apply one filter preset to all photos with \"Apply this look & framing to all clips\" for a consistent style.",
      "Set the song to loop if your slideshow is longer than the track.",
    ],
    faqs: [
      {
        question: "How long does each photo show?",
        answer: "3 seconds by default. You can change each photo to anywhere from 0.5 to 30 seconds.",
      },
      {
        question: "Are there transitions between photos?",
        answer:
          "Photos change with straight cuts. A fade in and out from black is available for the start and end of the whole video.",
      },
      {
        question: "Do animated GIFs play?",
        answer: "No. GIFs are imported as a still image.",
      },
      {
        question: "Can I add zoom or pan (Ken Burns) effects?",
        answer: "No. Photos are shown still; motion effects and keyframes aren't supported.",
      },
      {
        question: "Can I mix photos with video clips?",
        answer: "Yes. Photos and videos share the same video track and play in the order you arrange them.",
      },
    ],
    related: ["merge-videos", "add-music-to-video", "add-text-to-video", "video-filters"],
  },

  // 12. Video filters
  {
    slug: "video-filters",
    name: "Video Filters",
    h1: "Add Filters to Video Online, Free",
    title: "Video Filters Online Free - Color & B&W",
    description:
      "Add filters to video online free. Adjust brightness, contrast and saturation, or go black and white, sepia or blur. In-browser, no upload, no watermark.",
    keywords: [
      "video filters",
      "add filter to video",
      "black and white video",
      "sepia video",
      "adjust video brightness",
      "video color correction",
      "blur video",
    ],
    tagline: "Brighten dull footage, boost colour or go black and white with simple per-clip adjustments.",
    editorHint: "Select a clip and choose a preset or adjust the sliders in the Clip tab. Apply to all clips in one click.",
    preset: { panel: "clip" },
    intro: [
      "Small colour fixes make a big difference: lifting a dim indoor clip, adding punch to washed-out daylight footage, or giving a whole edit one mood. BuzzClips offers quick presets and manual sliders on every clip.",
      "Presets are Original, Vivid, Warm, Mono, Vintage, Fade and Dramatic. For finer control, adjust brightness, contrast and saturation, and add grayscale, sepia or blur. Grayscale gives a black-and-white look, sepia an old-photo tint, and blur softens the whole frame - useful for a dreamy look or a background under text.",
      "Filters apply to the entire clip. Once one clip looks right, \"Apply this look & framing to all clips\" copies it across the project so clips shot on different devices feel consistent.",
    ],
    steps: [
      {
        name: "Import your video",
        text: "Click \"Import\" and add your clips or photos.",
      },
      {
        name: "Pick a preset",
        text: "Select a clip and try the presets in the Clip tab - Vivid, Warm, Mono, Vintage, Fade or Dramatic.",
      },
      {
        name: "Fine-tune",
        text: "Adjust brightness, contrast, saturation, grayscale, sepia and blur until the preview looks right.",
      },
      {
        name: "Apply and export",
        text: "Click \"Apply this look & framing to all clips\" if you want a consistent style, then \"Export\" and \"Download MP4\".",
      },
    ],
    tips: [
      "Push contrast and saturation a little at a time - small changes usually look more natural.",
      "Mono plus a touch of extra contrast gives a classic black-and-white feel.",
      "Choose \"Original\" to reset a clip if you've gone too far.",
      "Light blur on a clip under a title helps the text stand out.",
    ],
    faqs: [
      {
        question: "Which filters are available?",
        answer:
          "Presets Original, Vivid, Warm, Mono, Vintage, Fade and Dramatic, plus sliders for brightness, contrast, saturation, grayscale, sepia and blur.",
      },
      {
        question: "Can I blur just one part of the video, like a face?",
        answer: "No. Blur applies to the whole clip. Selective or masked blur isn't supported.",
      },
      {
        question: "Can I use different filters on different clips?",
        answer: "Yes. Filters are set per clip, or copied to every clip with \"Apply this look & framing to all clips\".",
      },
      {
        question: "Do filters work on photos?",
        answer: "Yes. Photos on the timeline use the same filter controls as video clips.",
      },
      {
        question: "Is it free and private?",
        answer: "Yes. Filters are rendered in your browser on export, with no upload and no watermark.",
      },
    ],
    related: ["photo-to-video", "rotate-video", "instagram-reels-editor"],
  },

  // 13. Instagram Reels editor
  {
    slug: "instagram-reels-editor",
    name: "Instagram Reels Editor",
    h1: "Instagram Reels Editor - Free, in Your Browser",
    title: "Instagram Reels Editor Online Free",
    description:
      "Free Instagram Reels editor in your browser. Make 9:16 videos at 1080x1920 with text, music and filters, then export an MP4 with no watermark. No signup.",
    keywords: [
      "instagram reels editor",
      "reels video editor",
      "edit reels online",
      "instagram video editor",
      "make reels online",
      "reels maker",
    ],
    tagline: "Build a vertical Reel from your clips and photos and export a clean MP4 ready to upload.",
    editorHint: "Your project is set to 9:16. Import clips, add text and music, then export at 1080p for 1080x1920.",
    preset: { aspect: "9:16", panel: "project" },
    intro: [
      "Reels are vertical 9:16 videos, and a 1080p export gives you 1080x1920 - the full-screen size Instagram displays. This page opens the editor with a 9:16 project already set, so you can start importing straight away.",
      "Editing on a computer is useful when you've filmed on more than one device, want precise cuts, or prefer not to lose work if the app closes. BuzzClips autosaves your project in the browser, so a reload brings it back. When you're done, download the MP4 and upload it to Instagram as a Reel.",
      "If you also post to the feed, switch the Project tab to 4:5 or 1:1 and export a second version - no need to rebuild the edit.",
    ],
    steps: [
      {
        name: "Import your footage",
        text: "Click \"Import\" and add your clips and photos. The project is already 9:16.",
      },
      {
        name: "Cut it tight",
        text: "Trim the ends of each clip and use \"Split\" to remove slow parts. Set \"Fill (crop)\" so landscape clips fill the vertical frame.",
      },
      {
        name: "Add text and music",
        text: "Add a hook in the Text tab and a song in the Audio tab. Keep text clear of the bottom of the frame.",
      },
      {
        name: "Export and post",
        text: "Choose 1080p and 30 fps in the Project tab, click \"Export\", then \"Download MP4\" and upload it in Instagram.",
      },
    ],
    tips: [
      "Put a short text hook in the first second - many viewers decide quickly whether to keep watching.",
      "Keep important text in the middle of the frame; Instagram overlays the caption, buttons and username near the edges.",
      "Music added in BuzzClips is baked into the file. If you'd rather use Instagram's music library, export without music and add it in the app.",
      "Export a 4:5 version from the same project for the main feed.",
    ],
    faqs: [
      {
        question: "What size should an Instagram Reel be?",
        answer: "Vertical 9:16. At 1080p, BuzzClips exports 1080x1920, which fills the screen.",
      },
      {
        question: "Can I post directly to Instagram from BuzzClips?",
        answer:
          "No. Download the MP4 and upload it in the Instagram app or website. \"Publish to BuzzClips\" only shares to BuzzClips.",
      },
      {
        question: "Will my Reel have a watermark?",
        answer: "No. Exports have no watermark and you don't need an account to download.",
      },
      {
        question: "Can I use Instagram's sounds?",
        answer:
          "Not inside BuzzClips. You can add your own audio file, or export without music and choose a sound in Instagram when you post.",
      },
      {
        question: "Can I edit Reels on my phone?",
        answer:
          "Yes, the editor works in mobile browsers, though a desktop is recommended for longer or larger videos.",
      },
    ],
    related: ["tiktok-video-editor", "youtube-shorts-maker", "add-text-to-video", "crop-video"],
  },

  // 14. TikTok video editor
  {
    slug: "tiktok-video-editor",
    name: "TikTok Video Editor",
    h1: "TikTok Video Editor - Free and Private",
    title: "TikTok Video Editor Online Free",
    description:
      "Free online TikTok video editor. Trim, split, add text and music, and export a vertical 9:16 MP4 with no watermark. Your clips never leave your browser.",
    keywords: [
      "tiktok video editor",
      "tiktok editor online",
      "edit tiktok videos",
      "tiktok video maker",
      "vertical video editor",
      "tiktok no watermark",
    ],
    tagline: "Edit vertical TikTok videos on a real timeline and download a watermark-free MP4.",
    editorHint: "Project set to 9:16 for TikTok. Use S to split fast, then add a text hook and export at 1080p.",
    preset: { aspect: "9:16", panel: "project" },
    intro: [
      "TikTok rewards fast pacing: quick cuts, a hook up front, on-screen text for viewers watching muted. A timeline with keyboard shortcuts - S to split, D to duplicate, Delete to remove - makes that kind of edit quick on a computer.",
      "This page opens a vertical 9:16 project, which exports at 1080x1920 at 1080p. Because the export has no watermark, you can upload it to TikTok, and reuse the same file elsewhere, without another app's logo on it.",
      "Editing happens locally in your browser, so drafts and unreleased content stay on your device. Your project autosaves in the browser between sessions until you click \"New\".",
    ],
    steps: [
      {
        name: "Import clips",
        text: "Click \"Import\" or paste and drag files in. The 9:16 project is ready.",
      },
      {
        name: "Make quick cuts",
        text: "Move the playhead and press S to split, select pieces you don't need and press Delete. Drag clips to reorder.",
      },
      {
        name: "Add a hook and captions",
        text: "In the Text tab, type an opening line and captions, then time them on the text track.",
      },
      {
        name: "Export and upload",
        text: "Click \"Export\" and \"Download MP4\", then upload the file in TikTok.",
      },
    ],
    tips: [
      "Cut out every pause - even half a second of dead air feels long on TikTok.",
      "Keep captions in the upper-middle area; TikTok places its buttons on the right and its caption at the bottom.",
      "Use speed (up to 4x) for process shots so they fit in a few seconds.",
      "If you want a trending TikTok sound, export without music and add the sound inside TikTok.",
    ],
    faqs: [
      {
        question: "What resolution should TikTok videos be?",
        answer: "Vertical 9:16, 1080x1920. Choose 1080p in the Project tab to export at that size.",
      },
      {
        question: "Does BuzzClips add a watermark?",
        answer: "No. Exported videos are watermark-free.",
      },
      {
        question: "Can I auto-generate captions like TikTok does?",
        answer:
          "No. BuzzClips has no automatic captions. You can type captions as text overlays, or use TikTok's own caption feature after uploading.",
      },
      {
        question: "Does it have TikTok effects or green screen?",
        answer:
          "No. BuzzClips focuses on cutting, text, music, speed, filters and framing. Effects like green screen aren't included.",
      },
      {
        question: "Can I post to TikTok directly?",
        answer: "No. Download the MP4 and upload it through TikTok.",
      },
    ],
    related: ["instagram-reels-editor", "youtube-shorts-maker", "change-video-speed", "cut-video"],
  },

  // 15. YouTube Shorts maker
  {
    slug: "youtube-shorts-maker",
    name: "YouTube Shorts Maker",
    h1: "YouTube Shorts Maker - Free Online",
    title: "YouTube Shorts Maker Online Free",
    description:
      "Free YouTube Shorts maker. Turn clips or a section of a longer video into a vertical 9:16 Short with text and music. In-browser editing, no watermark.",
    keywords: [
      "youtube shorts maker",
      "youtube shorts editor",
      "make youtube shorts",
      "convert video to shorts",
      "shorts video maker",
      "vertical video for youtube",
    ],
    tagline: "Cut a vertical Short from new clips or from a horizontal video you've already made.",
    editorHint: "Project set to 9:16. Import a landscape video, set framing to \"Fill (crop)\" and trim to your best moment.",
    preset: { aspect: "9:16", panel: "project" },
    intro: [
      "Shorts are vertical 9:16 videos, so the classic workflow is to take a highlight from a horizontal YouTube video and reframe it. In BuzzClips, import the long video, trim or split down to the moment you want, and set the clip to \"Fill (crop)\" so the centre of the frame fills the vertical screen.",
      "If the subject isn't centred, \"Fit (show all)\" keeps the whole widescreen picture with bars above and below in your background colour - add a title in the top bar and a caption in the bottom bar to use that space.",
      "You can also build Shorts from scratch with phone footage and photos. Export at 1080p for 1080x1920, then upload the MP4 through YouTube.",
    ],
    steps: [
      {
        name: "Import your video",
        text: "Click \"Import\" and add a long video or several short clips. The project is already 9:16.",
      },
      {
        name: "Find the highlight",
        text: "Use \"Split\" and \"Start at playhead\" / \"End at playhead\" to isolate the section you want, and delete the rest.",
      },
      {
        name: "Reframe for vertical",
        text: "In the Clip tab, choose \"Fill (crop)\" to fill the screen, or \"Fit (show all)\" and add text in the bars.",
      },
      {
        name: "Export and upload",
        text: "Click \"Export\", then \"Download MP4\" and upload it to YouTube as a Short.",
      },
    ],
    tips: [
      "Pick a moment that makes sense without context - Short viewers haven't seen the full video.",
      "With Fit framing, a dark background colour makes the bars look intentional.",
      "Add a text title in the first seconds so people know what the Short is about.",
      "Long source files use a lot of memory - trim early, and use a desktop browser for hour-long videos.",
    ],
    faqs: [
      {
        question: "Can I turn a horizontal YouTube video into a Short?",
        answer:
          "Yes. Import the file from your device, cut it down, and use \"Fill (crop)\" or \"Fit (show all)\" framing in the 9:16 project.",
      },
      {
        question: "Can I import a video from a YouTube link?",
        answer: "No. You need the video file on your device. BuzzClips doesn't download from links.",
      },
      {
        question: "What size is a YouTube Short?",
        answer: "Vertical 9:16. At 1080p, BuzzClips exports 1080x1920.",
      },
      {
        question: "Can the crop follow a moving subject?",
        answer:
          "No. \"Fill (crop)\" keeps the centre of the frame. There's no automatic reframing or keyframed cropping.",
      },
      {
        question: "Is there a watermark?",
        answer: "No. The exported Short is watermark-free.",
      },
    ],
    related: ["youtube-video-editor", "tiktok-video-editor", "instagram-reels-editor", "crop-video"],
  },

  // 16. YouTube video editor
  {
    slug: "youtube-video-editor",
    name: "YouTube Video Editor",
    h1: "YouTube Video Editor - Free, No Download",
    title: "YouTube Video Editor Online Free",
    description:
      "Free YouTube video editor in your browser. Edit 16:9 videos at 1920x1080 with cuts, titles, music and fades, and export an MP4 with no watermark or upload.",
    keywords: [
      "youtube video editor",
      "free video editor for youtube",
      "edit youtube videos online",
      "16:9 video editor",
      "online video editor no download",
      "youtube editor",
    ],
    tagline: "Edit widescreen YouTube videos with cuts, titles, music and fades - no software to install.",
    editorHint: "Project set to 16:9. Export at 1080p for 1920x1080. Keep the tab visible while exporting.",
    preset: { aspect: "16:9", panel: "project" },
    intro: [
      "Standard YouTube videos are 16:9 widescreen, and 1080p means 1920x1080. This page starts a 16:9 project so you can go straight to editing a vlog, tutorial, review or gaming clip.",
      "The workflow covers the essentials of a typical YouTube edit: cut out mistakes and pauses with Split, reorder takes, add title cards and lower-third labels as text overlays, put music under the talking, and fade in and out from black at the start and end. Choose 24, 30 or 60 fps to match how you recorded.",
      "Because everything runs in your browser, there's nothing to install and your raw footage stays on your device. Long videos are possible, but they need plenty of memory and export time depends on your computer, so a recent desktop is recommended.",
    ],
    steps: [
      {
        name: "Import your recordings",
        text: "Click \"Import\" and add your clips, B-roll and photos. The project is already 16:9.",
      },
      {
        name: "Edit the story",
        text: "Split out mistakes and pauses, delete them, and drag clips into order on the timeline.",
      },
      {
        name: "Add titles and music",
        text: "Use the Text tab for a title and name labels, and the Audio tab for background music at a low volume.",
      },
      {
        name: "Polish and export",
        text: "Set resolution, fps and fade in/out in the Project tab, click \"Export\", keep the tab visible, then \"Download MP4\".",
      },
    ],
    tips: [
      "Match the export fps to your footage - 60 fps for gameplay, 24 or 30 fps for most talking-head videos.",
      "Keep music around 15-30% under speech so viewers can hear you clearly.",
      "Use a text overlay at the bottom as a lower third to introduce people or topics.",
      "Export can take a while for long videos; keep the tab in the foreground until it finishes.",
    ],
    faqs: [
      {
        question: "What resolution does it export for YouTube?",
        answer: "Up to 1080p, which is 1920x1080 for a 16:9 project. 4K export isn't available.",
      },
      {
        question: "Can I upload directly to YouTube?",
        answer: "No. Download the MP4 and upload it through YouTube.",
      },
      {
        question: "Can I make a thumbnail?",
        answer: "No. BuzzClips exports video only; create your thumbnail separately.",
      },
      {
        question: "How long can my video be?",
        answer:
          "There's no fixed limit in the editor, but files up to 4 GB are accepted and long projects need a lot of memory. A desktop browser is recommended.",
      },
      {
        question: "Will I lose my edit if I close the tab?",
        answer:
          "Your project and media autosave in the browser, so reopening the editor restores it. Clicking \"New\" clears it.",
      },
    ],
    related: ["youtube-shorts-maker", "merge-videos", "add-music-to-video", "add-text-to-video"],
  },
];

export function getEditorTool(slug: string): EditorTool | undefined {
  return EDITOR_TOOLS.find((tool) => tool.slug === slug);
}
