# Google Sheet Package - Optimized API REST Responses

## Overview

This package has been optimized to provide consistent, REST API-style responses with proper error handling, status codes, and structured data. All methods now return standardized response objects that follow industry best practices.

## Response Structure

All methods now return a consistent response format:

```typescript
interface ApiResponse<T = any> {
  success: boolean;        // Indicates if the operation was successful
  status: number;          // HTTP status code
  message: string;         // Human-readable message
  data: T | null;         // The actual data (null if error)
  error: ApiError | null; // Error details (null if success)
  timestamp: string;       // ISO timestamp of the response
}

interface ApiError {
  type: string;     // Error category (VALIDATION_ERROR, GOOGLE_API_ERROR, etc.)
  message: string;  // Detailed error message
  details?: any;    // Additional error context
  code: number;     // HTTP status code
}
```

## Usage Examples

### 1. Getting Data

```javascript
const sheet = new GoogleSheet({
  sheetId: "your-sheet-id",
  rowHead: 1,
  nameSheet: "Sheet1"
});

// Get all active data
const response = await sheet.getData();

if (response.success) {
  console.log(`Retrieved ${response.data.length} records`);
  console.log(response.data);
} else {
  console.error(`Error: ${response.error.message}`);
  console.error(`Type: ${response.error.type}`);
}

// Get all data including inactive records
const allDataResponse = await sheet.getData(true);
```

### 2. Inserting Data

```javascript
const insertResponse = await sheet.postData({
  data: {
    name: "John Doe",
    email: "john@example.com",
    department: "IT"
  },
  user: { alias: "admin" },
  includeId: true
});

if (insertResponse.success) {
  console.log("Data inserted successfully");
  console.log(`Rows added: ${insertResponse.data.rowsAdded}`);
  console.log(`Inserted data:`, insertResponse.data.insertedData);
} else {
  console.error("Insert failed:", insertResponse.error.message);
}
```

### 3. Updating Data

```javascript
const updateResponse = await sheet.updateData({
  colName: "id",
  id: 123,
  values: {
    name: "Jane Smith",
    department: "HR"
  }
});

if (updateResponse.success) {
  console.log("Data updated successfully");
  console.log(`Updated fields: ${updateResponse.data.updatedFields.join(', ')}`);
} else {
  if (updateResponse.status === 404) {
    console.error("Record not found");
  } else {
    console.error("Update failed:", updateResponse.error.message);
  }
}
```

### 4. Error Handling Examples

```javascript
// Example of handling different error types
const response = await sheet.getData();

if (!response.success) {
  switch (response.error.type) {
    case 'AUTHENTICATION_ERROR':
      // Redirect to login
      window.location.href = '/login';
      break;
      
    case 'PERMISSION_ERROR':
      alert('You don\'t have permission to access this sheet');
      break;
      
    case 'NOT_FOUND_ERROR':
      console.log('Sheet or range not found');
      break;
      
    case 'VALIDATION_ERROR':
      console.log('Invalid parameters:', response.error.details);
      break;
      
    case 'NETWORK_ERROR':
      // Retry logic
      setTimeout(() => sheet.getData(), 5000);
      break;
      
    default:
      console.error('Unexpected error:', response.error.message);
  }
}
```

### 5. Getting Headers

```javascript
const headersResponse = await sheet.getHeaders();

if (headersResponse.success) {
  console.log("Available columns:", headersResponse.data);
} else {
  console.error("Failed to get headers:", headersResponse.error.message);
}
```

### 6. Finding Records

```javascript
const recordResponse = await sheet.getDataById("email", "john@example.com");

if (recordResponse.success) {
  console.log("Found record:", recordResponse.data);
} else if (recordResponse.status === 404) {
  console.log("No record found with that email");
} else {
  console.error("Search failed:", recordResponse.error.message);
}
```

### 7. Deactivating Records

```javascript
const deactivateResponse = await sheet.disactive({
  colName: "id",
  id: 123
});

if (deactivateResponse.success) {
  console.log("Record deactivated successfully");
} else {
  console.error("Deactivation failed:", deactivateResponse.error.message);
}
```

## Status Codes

The package uses standard HTTP status codes:

- **200 OK**: Successful operation
- **201 Created**: Data successfully created
- **204 No Content**: Successful operation with no data to return
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Permission denied
- **404 Not Found**: Resource not found
- **409 Conflict**: Data conflict (e.g., duplicate key)
- **500 Internal Server Error**: Unexpected server error
- **503 Service Unavailable**: Google API rate limit or temporary unavailability

## Error Types

- **VALIDATION_ERROR**: Invalid input parameters
- **AUTHENTICATION_ERROR**: User authentication required
- **PERMISSION_ERROR**: Insufficient permissions
- **NOT_FOUND_ERROR**: Resource not found
- **NETWORK_ERROR**: Network connectivity issues
- **GOOGLE_API_ERROR**: Google Sheets API specific errors
- **INTERNAL_ERROR**: Unexpected internal errors

## Migration from Previous Version

If you're upgrading from a previous version, here are the key changes:

### Before (Legacy)
```javascript
const data = await sheet.getData();
if (data && !data.error) {
  // Process data
} else {
  // Handle error
}
```

### After (Optimized)
```javascript
const response = await sheet.getData();
if (response.success) {
  // Process response.data
} else {
  // Handle response.error
}
```

## Benefits

1. **Consistent Error Handling**: All methods return the same response structure
2. **Clear Error Information**: Detailed error types and messages
3. **HTTP Status Codes**: Standard status codes for different scenarios
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Better Debugging**: Timestamps and detailed error context
6. **Industry Standard**: Follows REST API conventions

## Breaking Changes

- All methods now return `ApiResponse<T>` objects instead of raw data
- Error handling has changed from `try/catch` with mixed return types to standardized error responses
- Some method signatures have been updated for consistency

Please update your code accordingly when upgrading to this version.