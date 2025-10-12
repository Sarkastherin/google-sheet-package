import { getDataInJSON, getDataInArray } from "./utils/functions.js";
import { convertGroupDates } from "./utils/daysFnc.js";
import {
  createSuccessResponse,
  createErrorResponse,
  mapGoogleApiError,
  validateRequiredFields,
  withErrorHandling,
  HTTP_STATUS,
  ERROR_TYPES
} from "./utils/responseHelper.js";

class GoogleSheet {
  constructor(props) {
    this.sheetId = props.sheetId;
    this.rowHead = props.rowHead;
    this.nameSheet = props.nameSheet;
    this.range = `${props.nameSheet}!A${this.rowHead}:ZZZ`;
    this.description = props.description;
  }

  async getResponse() {
    return withErrorHandling(async () => {
      const { result } = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: this.range,
        dateTimeRenderOption: "FORMATTED_STRING",
        valueRenderOption: "UNFORMATTED_VALUE",
      });

      if (result.error) {
        return mapGoogleApiError({ result }, 'getResponse');
      }

      return createSuccessResponse(result, HTTP_STATUS.OK, 'Data retrieved successfully');
    }, 'getResponse')();
  }

  async getData(bringInactive = false) {
    return withErrorHandling(async () => {
      const response = await this.getResponse();
      
      if (!response.success) {
        return response; // Return error response as-is
      }

      const result = response.data;
      
      if (!result.values || result.values.length === 0) {
        return createSuccessResponse([], HTTP_STATUS.OK, 'No data found in sheet');
      }

      const data = getDataInJSON(result.values);
      const dataFormattedDate = data.map((item) =>
        convertGroupDates(item, "es-en")
      );

      let finalData;
      if (bringInactive) {
        finalData = dataFormattedDate;
      } else {
        const activeData = dataFormattedDate.filter(
          (item) => item.active === true
        );
        finalData = activeData.length > 0 ? activeData : dataFormattedDate;
      }

      return createSuccessResponse(
        finalData,
        HTTP_STATUS.OK,
        `Retrieved ${finalData.length} records`
      );
    }, 'getData')();
  }

  async getHeaders() {
    return withErrorHandling(async () => {
      const response = await this.getResponse();
      
      if (!response.success) {
        return response; // Return error response as-is
      }

      const result = response.data;
      
      if (!result.values || result.values.length === 0) {
        return createErrorResponse(
          'No headers found in sheet',
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND
        );
      }

      const headers = result.values[0].map((item) => item.toLocaleLowerCase());
      
      return createSuccessResponse(
        headers,
        HTTP_STATUS.OK,
        'Headers retrieved successfully'
      );
    }, 'getHeaders')();
  }

  async postData({ data, user, includeId }) {
    return withErrorHandling(async () => {
      // Validate required data
      if (!data || typeof data !== 'object') {
        return createErrorResponse(
          'Data is required and must be an object',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION
        );
      }

      // Prepare data
      const dataToInsert = { ...data };
      
      if (user) {
        dataToInsert.registrado_por = user.alias;
      }
      
      if (includeId) {
        const lastIdResponse = await this.getLastId();
        if (!lastIdResponse.success) {
          return lastIdResponse;
        }
        dataToInsert.id = lastIdResponse.data + 1;
      }
      
      dataToInsert.active = true;
      const fechaActual = new Date();
      const fechaFormateada = fechaActual.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      dataToInsert.fecha_creacion = fechaFormateada;
      
      convertGroupDates(dataToInsert, "en-es");
      
      // Get headers
      const headersResponse = await this.getHeaders();
      if (!headersResponse.success) {
        return headersResponse;
      }

      const headers = headersResponse.data;
      const newData = getDataInArray(dataToInsert, [...headers]);

      const { result, status } = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: this.range,
        includeValuesInResponse: true,
        insertDataOption: "INSERT_ROWS",
        responseDateTimeRenderOption: "FORMATTED_STRING",
        responseValueRenderOption: "FORMATTED_VALUE",
        valueInputOption: "USER_ENTERED",
        resource: {
          majorDimension: "ROWS",
          range: "",
          values: [newData],
        },
      });

      if (result.error) {
        return mapGoogleApiError({ result }, 'postData');
      }

      return createSuccessResponse(
        {
          insertedData: dataToInsert,
          rowsAdded: result.updates?.updatedRows || 1,
          range: result.updates?.updatedRange
        },
        HTTP_STATUS.CREATED,
        'Data inserted successfully'
      );
    }, 'postData')();
  }

  async updateData({ colName, id, values }) {
    return withErrorHandling(async () => {
      // Validate inputs
      const validation = validateRequiredFields(
        { colName, id, values },
        ['colName', 'id', 'values']
      );
      if (validation) {
        return validation;
      }

      if (typeof values !== 'object' || Object.keys(values).length === 0) {
        return createErrorResponse(
          'Values must be a non-empty object',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION
        );
      }

      convertGroupDates(values, "en-es");
      
      const dataResponse = await this.getData(true); // Get all data including inactive
      if (!dataResponse.success) {
        return dataResponse;
      }

      const data = dataResponse.data;
      const index = data.findIndex((item) => item[colName] === id);
      
      if (index < 0) {
        return createErrorResponse(
          `Record with ${colName} = ${id} not found`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND,
          { colName, id }
        );
      }

      const row = index + this.rowHead + 1;
      const dataUpdate = [];
      
      for (let item in values) {
        dataUpdate.push({
          row: row,
          column: this.getNumCol(item, data),
          value: values[item],
        });
      }

      const dataPost = dataUpdate
        .filter(item => item.column > 0)
        .map(item => ({
          majorDimension: "ROWS",
          range: `${this.nameSheet}!R${item.row}C${item.column}`,
          values: [[item.value]],
        }));

      if (dataPost.length === 0) {
        return createErrorResponse(
          'No valid columns found to update',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION,
          { invalidColumns: Object.keys(values) }
        );
      }

      const { result, status } = await gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.sheetId,
        resource: {
          data: dataPost,
          includeValuesInResponse: false,
          responseDateTimeRenderOption: "FORMATTED_STRING",
          responseValueRenderOption: "FORMATTED_VALUE",
          valueInputOption: "USER_ENTERED",
        },
      });

      if (result.error) {
        return mapGoogleApiError({ result }, 'updateData');
      }

      return createSuccessResponse(
        {
          updatedFields: Object.keys(values),
          rowsUpdated: result.totalUpdatedRows || 1,
          cellsUpdated: result.totalUpdatedCells || dataPost.length
        },
        HTTP_STATUS.OK,
        'Data updated successfully'
      );
    }, 'updateData')();
  }
  async update({ colName, id, values }) {
    return withErrorHandling(async () => {
      // Validate inputs
      const validation = validateRequiredFields(
        { colName, id, values },
        ['colName', 'id', 'values']
      );
      if (validation) {
        return validation;
      }

      if (typeof values !== 'object' || Object.keys(values).length === 0) {
        return createErrorResponse(
          'Values must be a non-empty object',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION
        );
      }

      convertGroupDates(values, "en-es");
      
      const dataResponse = await this.getData(true); // Get all data including inactive
      if (!dataResponse.success) {
        return dataResponse;
      }

      const data = dataResponse.data;
      const index = data.findIndex((item) => item[colName] === id);
      
      if (index < 0) {
        return createErrorResponse(
          `Record with ${colName} = ${id} not found in sheet ${this.nameSheet}`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND,
          { colName, id, sheet: this.nameSheet }
        );
      }

      const row = index + this.rowHead + 1;
      const dataUpdate = [];
      
      for (let item in values) {
        dataUpdate.push({
          row: row,
          column: this.getNumCol(item, data),
          value: values[item],
        });
      }

      const dataPost = dataUpdate
        .filter(item => item.column > 0)
        .map(item => ({
          majorDimension: "ROWS",
          range: `${this.nameSheet}!R${item.row}C${item.column}`,
          values: [[item.value]],
        }));

      if (dataPost.length === 0) {
        return createErrorResponse(
          'No valid columns found to update',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION,
          { invalidColumns: Object.keys(values) }
        );
      }

      const { status, error } = await gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.sheetId,
        resource: {
          data: dataPost,
          includeValuesInResponse: false,
          responseDateTimeRenderOption: "FORMATTED_STRING",
          responseValueRenderOption: "FORMATTED_VALUE",
          valueInputOption: "USER_ENTERED",
        },
      });

      if (error) {
        return createErrorResponse(
          `Update failed: ${error.message}`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.GOOGLE_API,
          { error }
        );
      }

      return createSuccessResponse(
        {
          updatedRecord: { [colName]: id },
          updatedFields: Object.keys(values),
          rowUpdated: row
        },
        HTTP_STATUS.OK,
        'Record updated successfully'
      );
    }, 'update')();
  }
  async disactive({ colName, id }) {
    return withErrorHandling(async () => {
      const validation = validateRequiredFields({ colName, id }, ['colName', 'id']);
      if (validation) {
        return validation;
      }

      const result = await this.updateData({ colName, id, values: { active: false } });
      
      if (result.success) {
        return createSuccessResponse(
          { [colName]: id, active: false },
          HTTP_STATUS.OK,
          'Record deactivated successfully'
        );
      }
      
      return result; // Return the error from updateData
    }, 'disactive')();
  }
  async getLastId() {
    return withErrorHandling(async () => {
      const dataResponse = await this.getData(true); // Get all data including inactive
      if (!dataResponse.success) {
        return dataResponse;
      }

      const data = dataResponse.data;
      
      if (data.length === 0) {
        return createSuccessResponse(0, HTTP_STATUS.OK, 'No records found, returning 0 as last ID');
      }

      const ids = data
        .map((item) => item.id)
        .filter(id => id !== undefined && id !== null && !isNaN(id))
        .map(id => Number(id));

      const lastId = ids.length > 0 ? Math.max(...ids) : 0;
      
      return createSuccessResponse(
        lastId,
        HTTP_STATUS.OK,
        `Last ID retrieved: ${lastId}`
      );
    }, 'getLastId')();
  }

  getNumCol(key, array) {
    let newArray = array[0];
    newArray = Object.keys(newArray);
    return newArray.indexOf(key) + 1;
  }

  async getDataById(key, value) {
    return withErrorHandling(async () => {
      const validation = validateRequiredFields({ key, value }, ['key', 'value']);
      if (validation) {
        return validation;
      }

      const dataResponse = await this.getData(true); // Get all data including inactive
      if (!dataResponse.success) {
        return dataResponse;
      }

      const data = dataResponse.data;
      const record = data.filter((item) => item[key] == value);

      if (record.length === 0) {
        return createErrorResponse(
          `Record not found with ${key} = ${value}`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND,
          { key, value }
        );
      }

      return createSuccessResponse(
        record,
        HTTP_STATUS.OK,
        'Record found successfully'
      );
    }, 'getDataById')();
  }
}
export default GoogleSheet;
