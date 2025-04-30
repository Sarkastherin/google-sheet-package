import dayjs from "dayjs";
export const convertGroupDates = (obj,type) => {
    for(let item in obj){
      const value = obj[item];
      if(type=='es-en') {
        
        if(isDateES(value)) {
          obj[item] = convertDate(type,value)
        }
      }
      else if(type=='en-es') {
        if(isDateEN(value)) {
          obj[item] = convertDate(type,value)
        }
      }
    }
    return obj
  }
  const isDateEN = (date) => {
    const regExp = new RegExp("^(\\d{2,4})-(\\d{1,2})-(\\d{1,2})$");
    return regExp.test(date)
  }
  const isDateES = (date) => {
    const regExp = new RegExp("^(\\d{1,2})/(\\d{1,2})/(\\d{2,4})$");
    return regExp.test(date)
  }
  const convertDate = (type, value) => {
    let newDate
    if(type=='es-en') {
      const [dia, mes, anno] = value.split("/");
      const myDate = new Date(`${mes}/${dia}/${anno}`);
      const myDateString = myDate.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      const [day, month, year] = myDateString.split("/");
      newDate = `${year}-${month}-${day}`
    }
    else if(type=='en-es') {
      const date = dayjs(value).format("YYYY-MM-DD");
      newDate = dayjs(date).format("DD/MM/YYYY");
    }
    return newDate
  }