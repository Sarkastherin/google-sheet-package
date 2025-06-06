import { getDataInJSON, getDataInArray } from "./utils/functions.js";
import { convertGroupDates } from "./utils/daysFnc.js";

class GoogleSheet {
  constructor(props) {
    this.sheetId = props.sheetId;
    this.rowHead = props.rowHead;
    this.nameSheet = props.nameSheet;
    this.range = `${props.nameSheet}!A${this.rowHead}:ZZZ`;
    this.description = props.description;
  }

  async getResponse() {
    try {
      const { result } = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: this.range,
        dateTimeRenderOption: "FORMATTED_STRING",
        valueRenderOption: "UNFORMATTED_VALUE",
      });
      return result;
    } catch (e) {
      console.log(e, this.nameSheet);
      if (e.result.error.code === 403) {
        window.location.reload();
      }
      return e.result;
    }
  }

  async getData(bringInactive) {
    try {
      const result = await this.getResponse();
      if (result.error) {
        return result;
      } else {
        const data = getDataInJSON(result.values);
        const dataFormattedDate = data.map((item) =>
          convertGroupDates(item, "es-en")
        );
        if (bringInactive) {
          return dataFormattedDate;
        } else {
          const activeData = dataFormattedDate.filter(
            (item) => item.active === true
          );
          return activeData.length > 0 ? activeData : dataFormattedDate;
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  async getHeaders() {
    try {
      const result = await this.getResponse();
      if (!result.error) {
        const headers = result.values[0];
        return headers.map((item) => item.toLocaleLowerCase());
      }
    } catch (e) {
      console.error("Problems with getHeaders", e);
    }
  }

  async postData({ data, user, includeId }) {
    if (user) {
      data.registrado_por = user.alias;
    }
    if (includeId) {
      data.id = (await this.getLastId()) + 1;
    }
    data.active = true;
    const fechaActual = new Date();
    const fechaFormateada = fechaActual.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    data.fecha_creacion = fechaFormateada;
    convertGroupDates(data, "en-es");
    const headers = await this.getHeaders();
    if (headers) {
      const newData = getDataInArray(data, headers);
      try {
        let { result, status } =
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
          throw new Error(
            `Code: ${result.error.code} | Message: ${result.error.message}`
          );
        }
        return { result, status, response: data };
      } catch (e) {
        console.log("Problems with postData", e);
      }
    }
  }

  async updateData({ colName, id, values }) {
    convertGroupDates(values, "en-es");
    let dataUpdate = [];
    try {
      const data = await this.getData();
      const index = data.findIndex((item) => item[colName] === id);
      console.log("index", index);
      if (index >= 0) {
        const row = index + this.rowHead + 1;
        for (let item in values) {
          dataUpdate.push({
            row: row,
            column: this.getNumCol(item, data),
            value: values[item],
          });
        }
        console.log(dataUpdate);
        const dataPost = new Array();
        for (let item of dataUpdate) {
          if (item.column > 0) {
            dataPost.push({
              majorDimension: "ROWS",
              range: `${this.nameSheet}!R${item.row}C${item.column}`,
              values: [[item.value]],
            });
          }
        }
        try {
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
            throw new Error(
              `Code: ${result.error.code} | Message: ${result.error.message}`
            );
          }
          return { status };
        } catch (e) {
          console.log(e);
        }
      } else {
        console.error("No se encontró la fila");
      }
    } catch (e) {
      console.log(e);
    }
  }
  async update({ colName, id, values }) {
    convertGroupDates(values, "en-es");
    let dataUpdate = [];
    try {
      const data = await this.getData();
      const index = data.findIndex((item) => item[colName] === id);
      if (index >= 0) {
        const row = index + this.rowHead + 1;
        for (let item in values) {
          dataUpdate.push({
            row: row,
            column: this.getNumCol(item, data),
            value: values[item],
          });
        }
        const dataPost = new Array();
        for (let item of dataUpdate) {
          if (item.column > 0) {
            dataPost.push({
              majorDimension: "ROWS",
              range: `${this.nameSheet}!R${item.row}C${item.column}`,
              values: [[item.value]],
            });
          }
        }
        try {
          const {status, error} =
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
          if (error) {
            throw new Error(`Problemas con la solicitud ${error.message}`);
          }
          return { status};
        } catch (e) {
          console.log(e);
        }
      } else {
        throw new Error(`El ID ${id} no existe en la hoja ${this.nameSheet}`);
      }
    } catch (e) {
      return { error: e };
    }
  }
  async disactive({ colName, id }) {
    try {
      await this.updateData({ colName, id, values: { active: false } });
    } catch (e) {
      console.log(e);
    }
  }
  async getLastId() {
    const data = await this.getData();
    if (data.length > 0) {
      const Ids = data.map((item) => item.id);
      return Math.max(...Ids) || 0;
    } else {
      return 0;
    }
  }

  getNumCol(key, array) {
    let newArray = array[0];
    newArray = Object.keys(newArray);
    return newArray.indexOf(key) + 1;
  }

  async getDataById(key, value) {
    try {
      const data = await this.getData();
      const index = data.findIndex((item) => item[key] == value);
      if (index >= 0) {
        return data[index];
      } else {
        console.error("No se encontró el dato");
      }
    } catch (e) {
      console.log(e);
    }
  }
}
export default GoogleSheet;
