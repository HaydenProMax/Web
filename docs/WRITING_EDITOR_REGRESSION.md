# Writing Editor Regression

## Goal

Use this checklist to manually verify the V7.0 writing editor flow, especially the new Markdown block.

## Before You Start

Make sure these are ready:

- the PostgreSQL database is running
- the root `.env` points at the active database
- the seeded workspace account exists
- at least one writing draft exists if you want to verify the draft detail page as well

Recommended login:

- email: `hayden@example.com`
- password: `hayden-workstation`

## Start The App

From the workspace root:

```bash
pnpm dev
```

If you are running from WSL, prefer your upgraded Node 22 environment.

## Regression Pass

### New Draft

1. Open `/sign-in` and sign in.
2. Open `/writing/new`.
3. Confirm the page renders `Content Blocks` and the preview panel.
4. Confirm the toolbar shows:
   - `Add Paragraph`
   - `Add Heading`
   - `Add Quote`
   - `Add Markdown`
   - `Add Image`
   - `Add Video`

### Markdown Block

1. Click `Add Markdown`.
2. Paste this sample into the Markdown block:

```md
# Markdown Title

This is **bold**, *italic*, and `inline code`.

> Markdown quote line

- first item
- second item

1. ordered one
2. ordered two

[OpenAI](https://openai.com)

```ts
const value = "markdown works";
console.log(value);
```
```

3. Confirm the right-side preview renders:
   - the heading as a real heading
   - bold text as bold
   - italic text as italic
   - inline code with code styling
   - the quote as a quote block
   - unordered and ordered lists as lists
   - the link as a clickable link
   - the fenced code block as a styled code section
4. Open `Generated JSON` and confirm a block like this appears:

```json
{
  "type": "markdown",
  "content": "..."
}
```

### Save And Reopen

1. Save the draft.
2. Re-open the saved draft from `/writing` or `/writing/drafts/[id]`.
3. Confirm the Markdown block is still present in the editor.
4. Confirm the preview still renders the Markdown correctly after reload.

### Mixed Content

1. Add a paragraph block above the Markdown block.
2. Add an image or video block below it.
3. Confirm the preview order matches the editor order.
4. Move the Markdown block up and down.
5. Confirm the preview order updates correctly.

### Publish Path

1. Publish the draft.
2. Open the published article page.
3. Confirm the Markdown section renders correctly there too, not only inside the draft preview.

## Expected Result

The Markdown block should:

- save as a real `markdown` node
- re-open without being converted into another block type
- render consistently in draft preview and published article view
- coexist cleanly with paragraph, heading, quote, image, and video blocks
