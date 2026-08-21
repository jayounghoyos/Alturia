# @alturia/widget

Embeddable chat script for Asis Altura. Builds to a single `widget.js`
(IIFE, Shadow DOM) meant for a `<script src="..." defer>` on
asisaltura.com — one fixed bot, no `data-client-id`.

```bash
pnpm --filter widget build
# then serve apps/widget/dist and open /test.html to try the embed
```
