# REDACT-ENGINE
A browser-based tool to safely redact sensitive names and monetary values from plain text documents before they are printed for public release.

The Challenge:
Build an interactive text-processing interface.
Requirements: A large <textarea> for pasting raw text, and an "Analyze" button. Below it, an
"Output Box" (a<div>) that displays the processed text. A sidebar with a counter showing
"Words Redacted: 0" and a "Reveal All" toggle switch.
Interactivity (The Catch - AI Proofing): 
1. Click-to-Redact: When the user clicks "Analyze", the
raw text is injected into the Output Box. However, every single word must be wrapped in its own
HTML <span>.
2. Interaction: The user can click any individual word in the Output Box. Clicking it turns the
word into a black rectangle (e.g., CSS background color black, text color black) and increments
the "Words Redacted" counter by 1. Clicking it again un-redacts it and decrements the counter.
3. The Reveal Toggle: If the user flips the "Reveal All" toggle, all redacted words temporarily turn
red so the user can see what they hid, but the counter does not change. Toggling it off returns
them to black boxes.
