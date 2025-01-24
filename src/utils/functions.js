export const getDataInJSON = (array) => {
  const headers = array[0];
  const newArray = []; 
  for (var i = 1; i < array.length; i++) {
    // Iteramos desde 1 para evitar el primer elemento que son los encabezados
    const obj = {};
    // Iteramos a través de cada elemento del array actual
    for (var j = 0; j < headers.length; j++) {
      // Usamos los encabezados como claves y asignamos los valores correspondientes
      obj[headers[j].toLowerCase()] = array[i][j];
    }
    newArray.push(obj); // Agregamos el objeto al nuevo array
  }
  return newArray;
};
export const normalizeString = (str) => {
  if(!str) return ""
  return str
    .toLocaleString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase(); 
}
export const getDataInArray = (data, headers) => {
  for (let i = 0; i < headers.length; i++) {
    const item = headers[i];
    if (data.hasOwnProperty(item)) {
      headers[i] = data[item];
    } else {
      headers[i] = ""; 
    }
  }
  return headers;
}
export const dataJoin = (data1, data2, att1, att2) => {
  const data = [...data1];
  data.map(item => {
      const elem = data2.find(el => el[att2] === item[att1])
      Object.assign(item, elem)
  })
 return data
}
export const  createId = ({num, data, columnId}) => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(2)
    let IDs = data.filter(
      (item) =>
        item[columnId] &&
        item[columnId].toString().startsWith(num) &&
        item[columnId].toString().endsWith(year)
    );
    IDs = IDs.map((item) => Number(item[columnId].toString().slice(1,5)));
    const ID = IDs.length < 1 ? 1 : Math.max(... IDs) + 1
    return Number(`${num}${String(ID).padStart(4, "0")}${year}`); 
}

