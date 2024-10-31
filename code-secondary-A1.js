/*==================================================================================================================================================*
 *                                                              Code secondary                                                                      *
 *==================================================================================================================================================*/

function listFunctionsOnGoogleSheet() {
    
 var idSheet = "1h6qVn_28l3t4qUEA2I6ebRxpytvwOVO-HxGl_s5931g"; 
 var linkSheet = "https://docs.google.com/spreadsheets/d/1h6qVn_28l3t4qUEA2I6ebRxpytvwOVO-HxGl_s5931g/edit?gid=0#gid=0";

  const funciones = [];
  
  // Obtiene todas las funciones definidas en el archivo
  for (let nombre in this) {
    if (typeof this[nombre] === "function" && !nombre.startsWith("_")) {
      funciones.push([nombre]);  // Coloca el nombre como un array para insertarlo en la hoja
    }
  }

  // Invierte el orden de las funciones
  funciones.reverse();

  // Define el ID de la hoja de cálculo y abre la hoja llamada "Funciones"
  const sheetId = idSheet;  // Reemplaza con tu ID de hoja
  const hoja = SpreadsheetApp.openById(sheetId).getSheetByName("Funciones");

  if (!hoja) {
    Logger.log("La hoja 'Funciones' no existe.");
    return;
  }

  // Limpia solo desde la segunda fila en adelante
  const lastRow = hoja.getLastRow();
  if (lastRow > 1) {
    hoja.getRange(2, 1, lastRow - 1, hoja.getLastColumn()).clearContent();
  }

  // Escribe los nombres de las funciones en el orden inverso
  hoja.getRange(2, 1, funciones.length, 1).setValues(funciones);

  Logger.log("Funciones enviadas a la hoja 'Funciones' en orden inverso.");
}

function sendStats(chatId) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Mensajes');
  const lastRow = sheet.getLastRow();
  const message = `📊 Estadísticas:\nTotal de traducciones: ${lastRow - 1}`;
  sendTelegramMessage(chatId, message);
}

function saveToSheet(text, chatId, userName) {
  try {
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Mensajes');
    spreadsheet.appendRow([new Date(), text, chatId, userName]);
    Logger.log("Mensaje guardado en la hoja de cálculo.");
  } catch (e) {
    Logger.log("Error guardando en Sheet: " + e.message);
  }
}
