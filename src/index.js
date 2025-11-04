import { getDataInJSON, getDataInArray, getNumCol } from "./utils/functions.js";
import { convertGroupDates } from "./utils/daysFnc.js";
import {
  createSuccessResponse,
  createErrorResponse,
  mapGoogleApiError,
  validateRequiredFields,
  withErrorHandling,
  HTTP_STATUS,
  ERROR_TYPES,
} from "./utils/responseHelper.js";

class GoogleSheet {
  constructor(props) {
    // Validate required properties
    if (!props.nameFile) {
      throw new Error("nameFile is required in GoogleSheet constructor");
    }

    this.sheetId = props.sheetId;
    this.rowHead = props.rowHead;
    this.nameSheet = props.nameSheet;
    this.range = `${props.nameSheet}!A${this.rowHead}:ZZZ`;
    this.nameFile = props.nameFile;
  }
  async #getResponse() {
    const context = {
      fileName: this.nameFile,
      sheetName: this.nameSheet,
      sheetId: this.sheetId,
    };

    return withErrorHandling(
      async () => {
        const { result } = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetId,
          range: this.range,
          dateTimeRenderOption: "FORMATTED_STRING",
          valueRenderOption: "UNFORMATTED_VALUE",
        });

        if (result.error) {
          return mapGoogleApiError({ result }, "#getResponse", context);
        }

        return createSuccessResponse(
          result,
          HTTP_STATUS.OK,
          "Data retrieved successfully"
        );
      },
      "#getResponse",
      context
    )();
  }
  async getData({ columnName, value, operator = "=", multiple = true } = {}) {
    return withErrorHandling(async () => {
      const response = await this.#getResponse();

      if (!response.success) {
        return response; // Return error response as-is
      }

      const result = response.data;

      if (!result.values || result.values.length === 0) {
        return createSuccessResponse(
          [],
          HTTP_STATUS.OK,
          "No data found in sheet"
        );
      }

      const data = getDataInJSON(result.values);

      // Filtrar filas que no tienen ID válido
      let filteredData = data.filter((item) => {
        const id = item.id;

        // Una fila es válida solo si tiene un ID que no sea vacío
        if (id === null || id === undefined) return false;

        const idString = String(id).trim();
        return idString !== "" && idString !== "0";
      });

      // Aplicar filtro adicional si se especifican parámetros
      if (columnName && value !== undefined) {
        switch (operator) {
          case "=":
          case "==":
            filteredData = filteredData.filter(
              (item) => item[columnName] == value
            );
            break;
          case "!=":
            filteredData = filteredData.filter(
              (item) => item[columnName] != value
            );
            break;
          case ">":
            filteredData = filteredData.filter(
              (item) => Number(item[columnName]) > Number(value)
            );
            break;
          case "<":
            filteredData = filteredData.filter(
              (item) => Number(item[columnName]) < Number(value)
            );
            break;
          case ">=":
            filteredData = filteredData.filter(
              (item) => Number(item[columnName]) >= Number(value)
            );
            break;
          case "<=":
            filteredData = filteredData.filter(
              (item) => Number(item[columnName]) <= Number(value)
            );
            break;
          case "contains":
            filteredData = filteredData.filter((item) =>
              String(item[columnName])
                .toLowerCase()
                .includes(String(value).toLowerCase())
            );
            break;
          case "startsWith":
            filteredData = filteredData.filter((item) =>
              String(item[columnName])
                .toLowerCase()
                .startsWith(String(value).toLowerCase())
            );
            break;
          case "endsWith":
            filteredData = filteredData.filter((item) =>
              String(item[columnName])
                .toLowerCase()
                .endsWith(String(value).toLowerCase())
            );
            break;
          default:
            filteredData = filteredData.filter(
              (item) => item[columnName] == value
            );
        }

        // Si no se encontraron registros con el filtro especificado
        if (filteredData.length === 0) {
          return createErrorResponse(
            `No records found with ${columnName} ${operator} ${value}`,
            HTTP_STATUS.NOT_FOUND,
            ERROR_TYPES.NOT_FOUND,
            { columnName, operator, value }
          );
        }
      }

      const dataFormattedDate = filteredData.map((item) =>
        convertGroupDates(item, "es-en")
      );

      // Si se especificó un filtro y multiple=false, retornar solo el primer resultado
      const finalResult =
        columnName && value !== undefined && !multiple
          ? dataFormattedDate[0]
          : dataFormattedDate;

      const message =
        columnName && value !== undefined
          ? `Found ${dataFormattedDate.length} record(s) with ${columnName} ${operator} ${value}`
          : `Retrieved ${dataFormattedDate.length} records`;

      return createSuccessResponse(finalResult, HTTP_STATUS.OK, message);
    }, "getData")();
  }
  async #getHeaders() {
    return withErrorHandling(async () => {
      const response = await this.#getResponse();

      if (!response.success) {
        return response; // Return error response as-is
      }

      const result = response.data;

      if (!result.values || result.values.length === 0) {
        return createErrorResponse(
          "No headers found in sheet",
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND
        );
      }

      const headers = result.values[0].map((item) => item.toLocaleLowerCase());

      return createSuccessResponse(
        headers,
        HTTP_STATUS.OK,
        "Headers retrieved successfully"
      );
    }, "#getHeaders")();
  }
  async #getRow({ colName, id }) {
    return withErrorHandling(async () => {
      const response = await this.#getResponse();

      if (!response.success) {
        return response; // Return error response as-is
      }

      const result = response.data;

      if (!result.values || result.values.length === 0) {
        return createErrorResponse(
          "No headers found in sheet",
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND
        );
      }
      const values = result.values;
      const col = getNumCol(colName, values);
      const index = values.findIndex((item) => item[col] === id);
      if (index < 0) {
        return createErrorResponse(
          `Record with ${colName} = ${id} not found`,
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND,
          { colName, id }
        );
      }
      const row = index + this.rowHead;

      return createSuccessResponse(
        row,
        HTTP_STATUS.OK,
        "Row retrieved successfully"
      );
    }, "#getRow")();
  }
  async insert({ data }) {
    return withErrorHandling(async () => {
      // Validate required data
      if (!data || typeof data !== "object") {
        return createErrorResponse(
          "Data is required and must be an object",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION
        );
      }
      const dataToInsert = { ...data };
      const fechaActual = new Date();
      const fechaFormateada = fechaActual.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      dataToInsert.fecha_creacion = fechaFormateada;

      convertGroupDates(dataToInsert, "en-es");

      // Get headers
      const headersResponse = await this.#getHeaders();
      if (!headersResponse.success) {
        return headersResponse;
      }

      const headers = headersResponse.data;
      const newData = getDataInArray(dataToInsert, [...headers]);

      const { result, status } =
        await gapi.client.sheets.spreadsheets.values.append({
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
        return mapGoogleApiError({ result }, "insert");
      }

      return createSuccessResponse(
        {
          insertedData: dataToInsert,
          rowsAdded: result.updates?.updatedRows || 1,
          range: result.updates?.updatedRange,
        },
        HTTP_STATUS.CREATED,
        "Data inserted successfully"
      );
    }, "insert")();
  }
  async update({ colName, id, values }) {
    return withErrorHandling(async () => {
      // Validate inputs
      const validation = validateRequiredFields({ colName, id, values }, [
        "colName",
        "id",
        "values",
      ]);
      if (validation) {
        return validation;
      }

      if (typeof values !== "object" || Object.keys(values).length === 0) {
        return createErrorResponse(
          "Values must be a non-empty object",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION
        );
      }

      convertGroupDates(values, "en-es");

      const dataResponse = await this.getData();
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
      // Get Row
      const rowResponse = await this.#getRow({ colName, id });
      if (!rowResponse.success) {
        return rowResponse;
      }

      const row = rowResponse.data;
      const dataUpdate = [];

      for (let item in values) {
        dataUpdate.push({
          row: row,
          column: getNumCol(item, data),
          value: values[item],
        });
      }

      const dataPost = dataUpdate
        .filter((item) => item.column > 0)
        .map((item) => ({
          majorDimension: "ROWS",
          range: `${this.nameSheet}!R${item.row}C${item.column}`,
          values: [[item.value]],
        }));

      if (dataPost.length === 0) {
        return createErrorResponse(
          "No valid columns found to update",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION,
          { invalidColumns: Object.keys(values) }
        );
      }

      const { result, status } =
        await gapi.client.sheets.spreadsheets.values.batchUpdate({
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
        return mapGoogleApiError({ result }, "update");
      }

      return createSuccessResponse(
        {
          updatedFields: Object.keys(values),
          rowsUpdated: result.totalUpdatedRows || 1,
          cellsUpdated: result.totalUpdatedCells || dataPost.length,
        },
        HTTP_STATUS.OK,
        "Data updated successfully"
      );
    }, "update")();
  }
  async delete({ colName, id }) {
    return withErrorHandling(async () => {
      // Validate inputs
      const validation = validateRequiredFields({ colName, id }, [
        "colName",
        "id",
      ]);
      if (validation) {
        return validation;
      }
      // Get Row
      const rowResponse = await this.#getRow({ colName, id });
      if (!rowResponse.success) {
        return rowResponse;
      }

      const row = rowResponse.data;
      const range = `${this.nameSheet}!A${row}:ZZZ${row}`;

      const { result } = await gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: this.sheetId,
        range: range,
      });

      if (result.error) {
        return mapGoogleApiError({ result }, "delete");
      }

      return createSuccessResponse(
        {
          deletedRecord: { [colName]: id },
          clearedRange: result.clearedRange,
          rowDeleted: row,
        },
        HTTP_STATUS.OK,
        "Record deleted successfully"
      );
    }, "delete")();
  }
}
export default GoogleSheet;
