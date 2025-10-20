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

export function getNumCol(key, array) {
    let newArray = array[0];
    newArray = Object.keys(newArray);
    return newArray.indexOf(key) + 1;
  }