# @alturia/widget

widget.js embebible (IIFE, React en Shadow DOM). Un mismo build sirve a todos los bots:

```html
<script src="https://alturia-widget.vercel.app/widget.js" data-bot="pk_..." defer></script>
```

data-api cambia la URL del API. Sin data-bot se usa el bot por defecto. La marca, el
menú y los textos del bot vienen de GET /api/bot-config; cada flujo vive en src/features/.
El dashboard importa @alturia/widget/preview para la vista previa en vivo.

```bash
pnpm --filter widget test
pnpm --filter widget build   # luego sirve dist/ y abre /test.html
```
