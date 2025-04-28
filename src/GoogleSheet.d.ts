// GoogleSheet.d.ts

declare module 'my-google-sheet' {
    interface GoogleSheetProps {
      sheetId: string;
      rowHead: number;
      nameSheet: string;
      description?: string;
    }
  
    class GoogleSheet {
      sheetId: string;
      rowHead: number;
      nameSheet: string;
      range: string;
      description?: string;
  
      constructor(props: GoogleSheetProps);
  
      // Method to get data from the Google Sheet
      getResponse(): Promise<any>;
  
      // Method to fetch data and return JSON formatted results
      getData(bringInactive: boolean): Promise<any[]>;
  
      // Method to get headers of the Google Sheet
      getHeaders(): Promise<string[]>;
  
      // Method to post new data to the Google Sheet
      postData({ data, user, includeId }: {
        data: Record<string, any>;
        user?: { alias: string };
        includeId?: boolean;
      }): Promise<any>;
  
      // Method to update data in the Google Sheet
      updateData({ colName, id, values }: {
        colName: string;
        id: any;
        values: Record<string, any>;
      }): Promise<any>;
  
      // Method to deactivate data by setting "active" to false
      disactive({ colName, id }: { colName: string; id: any }): Promise<void>;
  
      // Method to get the last ID in the sheet
      getLastId(): Promise<number>;
  
      // Helper method to map column names to indexes
      getNumCol(key: string, array: any[]): number;
  
      // Method to get data by specific ID
      getDataById(key: string, value: any): Promise<any>;
    }
  
    export default GoogleSheet;
  }
  