# XPath Picker (English)

This is an XPath copy extension for Edge / Chrome.  
You can select an element on a web page, then copy its XPath via the context menu or `Ctrl  C`.
> Built with Vibe Coding, so it is not recommended for production use.

## Main Features

- Copy XPath after selecting a page element
- Two copy methods are supported:
  - Copy from the context menu
  - Copy with keyboard shortcut `Ctrl  C`
- Optional feature: copy XPath together with element content (HTML)

## Difference from Browser Default Copy

When generating XPath, this extension only searches upward for at most 3 parent levels that contain `id` or `class` selectors.  
This makes XPath shorter and faster to generate, but it may not be unique and can match multiple elements.

## Known Issue

- The "copy element itself (HTML)" feature has a known bug.  
  Since this is rarely used, it is currently not fixed. Plain XPath copy is recommended.

## Recommended Companion Extension

It is recommended to use this with browser extension **xpath selector**:  
ID: `gffppcedbfdmbminpdameaajcbfaajdk`

## Installation (Developer Mode)

1. Open the browser extensions page (Edge/Chrome).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this project folder.
4. After installation, under "From other sources", you will see: `XPath Picker`.

---

中文说明请见：`ReadmeZH.md`
*** End Patch
