// GoogleSheet.d.ts

declare module 'google-sheet-package' {
  // Response interfaces for consistent API responses
  interface ApiResponse<T = any> {
    success: boolean;
    status: number;
    message: string;
    data: T | null;
    error: ApiError | null;
    timestamp: string;
  }

  interface ApiError {
    type: string;
    message: string;
    details?: any;
    code: number;
  }

  // Configuration interfaces
  interface GoogleSheetProps {
    sheetId: string;
    rowHead: number;
    nameSheet: string;
    nameFile: string;  // Required: Name of the file for error reporting
  }

  interface InsertParams {
    data: Record<string, any>;
    user?: { alias: string };
    includeId?: boolean;
  }

  interface UpdateParams {
    colName: string;
    id: any;
    values: Record<string, any>;
  }

  interface DisactiveParams {
    colName: string;
    id: any;
  }

  interface DeleteParams {
    colName: string;
    id: any;
  }

  interface GetDataParams {
    columnName?: string;
    value?: any;
    operator?: '=' | '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
    multiple?: boolean;
  }

  class GoogleSheet {
    sheetId: string;
    rowHead: number;
    nameSheet: string;
    range: string;
    nameFile: string;

    constructor(props: GoogleSheetProps);

    // Method to fetch data and return JSON formatted results with optional filtering
    getData(params?: GetDataParams): Promise<ApiResponse<Record<string, any>[] | Record<string, any>>>;

    // Method to post new data to the Google Sheet
    insert(params: InsertParams): Promise<ApiResponse<{
      insertedData: Record<string, any>;
      rowsAdded: number;
      range?: string;
    }>>;

    // Method to update existing data in the Google Sheet
    update(params: UpdateParams): Promise<ApiResponse<{
      updatedFields: string[];
      rowsUpdated: number;
      cellsUpdated: number;
    }>>;

    // Method to delete rows in the Google Sheet
    delete(params: DeleteParams): Promise<ApiResponse<{
      deletedRecord: Record<string, any>;
      clearedRange: string;
      rowDeleted: number;
    }>>;
  }

  export default GoogleSheet;
}
