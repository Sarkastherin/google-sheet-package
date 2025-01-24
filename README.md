# Google Sheet Package

Este paquete permite interactuar con Google Sheets usando la API de Google.

## Instalación

```bash
npm install google-sheet-package
```
## Uso
```javascript
import GoogleSheet from "google-sheet-package";

const sheet = new GoogleSheet({
  sheetId: "tu-sheet-id",
  rowHead: 1,
  nameSheet: "Hoja1",
  description: "Mi hoja de cálculo",
});

sheet.getData().then(data => console.log(data));
```
