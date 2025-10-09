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
    description?: string;
  }

  interface PostDataParams {
    data: Record<string, any>;
    user?: { alias: string };
    includeId?: boolean;
  }

  interface UpdateDataParams {
    colName: string;
    id: any;
    values: Record<string, any>;
  }

  interface DisactiveParams {
    colName: string;
    id: any;
  }

  class GoogleSheet {
    sheetId: string;
    rowHead: number;
    nameSheet: string;
    range: string;
    description?: string;

    constructor(props: GoogleSheetProps);

    // Method to get raw response from Google Sheets API
    getResponse(): Promise<ApiResponse<any>>;

    // Method to fetch data and return JSON formatted results
    getData(bringInactive?: boolean): Promise<ApiResponse<any[]>>;

    // Method to get headers of the Google Sheet
    getHeaders(): Promise<ApiResponse<string[]>>;

    // Method to post new data to the Google Sheet
    postData(params: PostDataParams): Promise<ApiResponse<{
      insertedData: Record<string, any>;
      rowsAdded: number;
      range?: string;
    }>>;

    // Method to update existing data in the Google Sheet
    updateData(params: UpdateDataParams): Promise<ApiResponse<{
      updatedFields: string[];
      rowsUpdated: number;
      cellsUpdated: number;
    }>>;

    // Alternative update method (legacy compatibility)
    update(params: UpdateDataParams): Promise<ApiResponse<{
      updatedRecord: Record<string, any>;
      updatedFields: string[];
      rowUpdated: number;
    }>>;

    // Method to deactivate a record
    disactive(params: DisactiveParams): Promise<ApiResponse<Record<string, any>>>;

    // Method to get the last ID in the sheet
    getLastId(): Promise<ApiResponse<number>>;

    // Method to get data by a specific key-value pair
    getDataById(key: string, value: any): Promise<ApiResponse<Record<string, any>>>;

    // Utility method to get column number
    getNumCol(key: string, array: any[]): number;
  }

  export default GoogleSheet;
}
