# Google Sheet Package

Un cliente moderno y eficiente para interactuar con Google Sheets. Diseñado para ser simple, potente y con respuestas consistentes siguiendo estándares REST API.

## ✨ Características

- **📊 Lectura avanzada**: Obtén todos los datos o filtra por columnas con operadores múltiples
- **➕ Inserción inteligente**: Agrega datos con validación automática y manejo de fechas
- **✏️ Actualización precisa**: Modifica registros específicos por cualquier campo de búsqueda
- **🗑️ Eliminación segura**: Limpia filas completas de manera controlada
- **🛡️ Respuestas estandarizadas**: Todas las operaciones retornan objetos con estructura REST consistente
- **🔒 Métodos privados**: API limpia con métodos internos protegidos
- **📝 TypeScript**: Soporte completo con tipado robusto

## 📦 Instalación

```bash
npm install google-sheet-package
```

## 🚀 Uso Básico

### Configuración

```javascript
import GoogleSheet from 'google-sheet-package';

const sheet = new GoogleSheet({
  sheetId: "tu-google-sheet-id",
  rowHead: 1,           // Fila donde empiezan los encabezados
  nameSheet: "Hoja1",   // Nombre de la hoja
  description: "Mi hoja de datos" // Opcional
});
```

## 📖 API Reference

### Estructura de Respuesta

Todas las operaciones retornan un objeto `ApiResponse` estandarizado:

```typescript
interface ApiResponse<T = any> {
  success: boolean;        // true si la operación fue exitosa
  status: number;          // Código de estado HTTP
  message: string;         // Mensaje descriptivo
  data: T | null;         // Datos (null si hay error)
  error: ApiError | null; // Detalles del error (null si es exitoso)
  timestamp: string;       // Timestamp ISO de la respuesta
}
```

### 1. 📊 Obtener Datos - `getData()`

El método más potente del paquete. Obtiene todos los datos o filtra por criterios específicos.

#### Obtener todos los datos
```javascript
const response = await sheet.getData();

if (response.success) {
  console.log(`${response.data.length} registros obtenidos`);
  response.data.forEach(record => console.log(record));
}
```

#### Filtrar por columna
```javascript
// Buscar por ID exacto (retorna objeto único)
const user = await sheet.getData({
  columnName: 'id',
  value: 10,
  multiple: false  // Retorna solo el primer resultado
});

// Buscar múltiples registros
const activeUsers = await sheet.getData({
  columnName: 'estado',
  value: 'activo'
});

// Búsquedas avanzadas con operadores
const adults = await sheet.getData({
  columnName: 'edad',
  value: 18,
  operator: '>='
});

const gmailUsers = await sheet.getData({
  columnName: 'email',
  value: 'gmail.com',
  operator: 'endsWith'
});
```

#### Operadores disponibles
- `'='` o `'=='` - Igualdad exacta
- `'!='` - Diferente
- `'>'`, `'<'`, `'>='`, `'<='` - Comparaciones numéricas
- `'contains'` - Contiene texto (case-insensitive)
- `'startsWith'` - Comienza con texto
- `'endsWith'` - Termina con texto

### 2. ➕ Insertar Datos - `insert()`

```javascript
const response = await sheet.insert({
  data: {
    nombre: "Juan Pérez",
    email: "juan@email.com",
    edad: 30,
    activo: true
  }
});

if (response.success) {
  console.log("Datos insertados correctamente");
  console.log(`Filas agregadas: ${response.data.rowsAdded}`);
  console.log("Datos insertados:", response.data.insertedData);
}
```

**Nota**: La fecha de creación (`fecha_creacion`) se agrega automáticamente en formato argentino (DD/MM/YYYY).

### 3. ✏️ Actualizar Datos - `update()`

```javascript
const response = await sheet.update({
  colName: "id",        // Campo de búsqueda
  id: 10,              // Valor a buscar
  values: {            // Campos a actualizar
    nombre: "Juan Carlos",
    edad: 31,
    estado: "activo"
  }
});

if (response.success) {
  console.log(`Campos actualizados: ${response.data.updatedFields.join(', ')}`);
  console.log(`Celdas modificadas: ${response.data.cellsUpdated}`);
}
```

### 4. 🗑️ Eliminar Datos - `delete()`

```javascript
const response = await sheet.delete({
  colName: "id",
  id: 10
});

if (response.success) {
  console.log("Registro eliminado correctamente");
  console.log(`Rango limpiado: ${response.data.clearedRange}`);
  console.log(`Fila eliminada: ${response.data.rowDeleted}`);
}
```

## 🛠️ Manejo de Errores

```javascript
const response = await sheet.getData();

if (!response.success) {
  console.error(`Error ${response.status}: ${response.error.message}`);
  
  // Manejo específico por tipo de error
  switch (response.error.type) {
    case 'VALIDATION_ERROR':
      console.log('Parámetros inválidos:', response.error.details);
      break;
    case 'NOT_FOUND_ERROR':
      console.log('No se encontraron registros');
      break;
    case 'GOOGLE_API_ERROR':
      console.log('Error de la API de Google Sheets');
      break;
    case 'NETWORK_ERROR':
      console.log('Problema de conectividad');
      break;
  }
}
```

### Códigos de Estado HTTP

- **200 OK**: Operación exitosa
- **201 Created**: Datos creados correctamente
- **400 Bad Request**: Parámetros inválidos
- **401 Unauthorized**: Autenticación requerida
- **403 Forbidden**: Sin permisos suficientes
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error interno del servidor

## 📋 Ejemplos Avanzados

### Búsqueda de usuarios por email
```javascript
const user = await sheet.getData({
  columnName: 'email',
  value: 'usuario@email.com',
  multiple: false
});

if (user.success && user.data) {
  console.log('Usuario encontrado:', user.data.nombre);
} else {
  console.log('Usuario no encontrado');
}
```

### Obtener todos los registros inactivos
```javascript
const inactiveRecords = await sheet.getData({
  columnName: 'activo',
  value: false
});
```

### Actualizar estado de múltiples registros por lotes
```javascript
const oldUsers = await sheet.getData({
  columnName: 'edad',
  value: 65,
  operator: '>='
});

if (oldUsers.success) {
  for (const user of oldUsers.data) {
    await sheet.update({
      colName: 'id',
      id: user.id,
      values: { categoria: 'senior' }
    });
  }
}
```

## 📝 TypeScript Support

```typescript
import GoogleSheet, { ApiResponse, GoogleSheetProps } from 'google-sheet-package';

interface UserRecord {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
}

const sheet = new GoogleSheet({
  sheetId: "your-sheet-id",
  rowHead: 1,
  nameSheet: "Users"
});

const response: ApiResponse<UserRecord[]> = await sheet.getData();
```

## ⚙️ Configuración Avanzada

### Filtrado automático de filas vacías
El paquete automáticamente filtra filas que no tienen un `id` válido, evitando procesar datos incompletos o filas en blanco.

### Formato de fechas
Las fechas se manejan automáticamente:
- **Inserción**: Se agrega `fecha_creacion` en formato DD/MM/YYYY (Argentina)
- **Lectura**: Las fechas se convierten del formato de Google Sheets al formato local

## 🔗 Requisitos

- [Google Sheets API](https://developers.google.com/sheets/api) configurada
- Biblioteca `gapi` cargada en el cliente
- Permisos de lectura/escritura en la hoja de cálculo
## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la [MIT License](https://choosealicense.com/licenses/mit/).

## 👨‍💻 Autor

**[@Sarkastherin](https://www.github.com/sarkastherin)**

## 🔗 Enlaces Útiles

- [Documentación Google Sheets API](https://developers.google.com/sheets/api/quickstart/js?hl=es-419)
- [Repositorio del Proyecto](https://github.com/Sarkastherin/google-sheet-package)
- [Guía de Autenticación Google](https://developers.google.com/workspace/guides/configure-oauth-consent)

---

⭐ Si este paquete te fue útil, ¡no olvides darle una estrella en GitHub!

