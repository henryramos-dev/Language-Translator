// - Version: Development-Language-Translator-A1-02.js

var apiToken = "7909431338:AAGyT5nkCNYdvjLqPNhlJsODbZ8CsL16v3U";
var appUrl = "https://script.google.com/macros/s/AKfycbzdKCn8ZQOkLrdo7WX5_xLvf074qw6bYSv4u5RSy4Intov7LSskeXPAQf_liLawhrzf-Q/exec";
var apiUrl = "https://api.telegram.org/bot" + apiToken;
var spreadsheetId = '1cZg_1DSY6O1dcIooDOBuVkUVH_3PpDBJJTrUQ2E5aU8';
var chatId = 287887115;
var sheetBot = 'https://docs.google.com/spreadsheets/d/1h6qVn_28l3t4qUEA2I6ebRxpytvwOVO-HxGl_s5931g/edit?gid=0#gid=0';

function setWebhook() {
  var url = apiUrl + "/setwebhook?url=" + appUrl;
  var res = UrlFetchApp.fetch(url).getContentText();
  Logger.log(res);
}

function doPost(e) {
  Logger.log("Iniciando doPost...");
  try {
    if (!e || !e.postData || !e.postData.contents) {
      Logger.log("No hay datos en e.postData.contents.");
      sendTelegramMessage(chatId, "No se recibió ningún contenido en el webhook.");
      return;
    }

    var webhookData;
    try {
      webhookData = JSON.parse(e.postData.contents);
      Logger.log("Datos del webhook recibidos: " + JSON.stringify(webhookData));
    } catch (jsonError) {
      Logger.log("Error al parsear JSON: " + jsonError.message);
      sendTelegramMessage(chatId, "Error al interpretar los datos recibidos.");
      return;
    }

    var chatId = webhookData.message.chat.id;
    var messageText = webhookData.message.text || "";
    var userName = webhookData.message.from.first_name || "Usuario";
    
    Logger.log("ID del chat: " + chatId);
    Logger.log("Texto recibido: " + messageText);

    if (messageText.startsWith('/')) {
      handleCommand(messageText, chatId, userName);
      return;
    }

    if (messageText.trim() === "") {
      Logger.log("El mensaje recibido está vacío.");
      sendTelegramMessage(chatId, "El mensaje recibido está vacío. Por favor, envía un texto para traducir.");
      return;
    }

    // Guardar el texto recibido en la hoja de Google Sheets
    saveToSheet(messageText, chatId, userName);

    // Detectar el idioma del mensaje
    var detectedLanguage = improvedLanguageDetection(messageText);
    Logger.log("Idioma detectado: " + detectedLanguage);

    var translation = smartTranslate(messageText, detectedLanguage);
    sendFormattedTranslation(chatId, messageText, translation, detectedLanguage);

  } catch (error) {
    Logger.log("Error general en doPost: " + error.message);
    sendTelegramMessage(chatId, "Ocurrió un error al procesar tu mensaje. Inténtalo nuevamente más tarde.");
  }
}

function handleCommand(command, chatId, userName) {
  switch (command) {
    case '/start':
      sendWelcomeMessage(chatId, userName);
      break;
    case '/help':
      sendHelpMessage(chatId);
      break;
    case '/stats':
      sendStats(chatId);
      break;
    default:
      sendTelegramMessage(chatId, "Comando no reconocido. Usa /help para ver los comandos disponibles.");
  }
}

function sendWelcomeMessage(chatId, userName) {
  const message = `¡Hola ${userName}! 👋\n\n` +
                 "Soy tu asistente de traducción Español-Inglés.\n" +
                 "Simplemente envíame un mensaje y lo traduciré automáticamente.\n\n" +
                 "Usa /help para ver todos los comandos disponibles.";
  sendTelegramMessage(chatId, message);
}

function sendHelpMessage(chatId) {
  const message = "📚 Comandos disponibles:\n\n" +
                 "/start - Iniciar el bot\n" +
                 "/help - Ver esta ayuda\n" +
                 "/stats - Ver estadísticas de uso\n\n" +
                 "También puedes simplemente enviar un mensaje y detectaré automáticamente el idioma.";
  sendTelegramMessage(chatId, message);
}

function sendTelegramMessage(chatId, text) {
  var url = apiUrl + '/sendMessage';
  var payload = {
    'chat_id': String(chatId),
    'text': text
  };
  
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log("Respuesta de Telegram: " + response.getContentText());
  } catch (e) {
    Logger.log("Error enviando el mensaje: " + e.message);
  }
}

function improvedLanguageDetection(text) {
  try {
    const normalizedText = normalizeText(text);
    const translations = getTranslationsFromSheets();
    
    // 1. Verificar diccionarios primero
    if (translations && translations['es-en'][normalizedText]) {
      return 'es';
    }
    if (translations && translations['en-es'][normalizedText]) {
      return 'en';
    }
    
    // Resto de la lógica de detección de idioma...
    if (hasSpanishPatterns(text)) {
      return 'es';
    }
    
    const languageByFrequency = detectLanguageByWordFrequency(text);
    if (languageByFrequency) {
      return languageByFrequency;
    }
    
    if (hasMorphologicalSpanishPatterns(text)) {
      return 'es';
    }
    
    return detectFallback(text);
  } catch (e) {
    Logger.log("Error en improvedLanguageDetection: " + e.message);
    return detectFallback(text);
  }
}

function findPhrases(text) {
  const words = text.toLowerCase().split(/\s+/);
  const phrases = new Set();
  
  // Generar todas las combinaciones posibles de palabras contiguas
  for (let i = 0; i < words.length; i++) {
    let phrase = words[i];
    phrases.add(phrase);
    
    for (let j = i + 1; j < words.length && j < i + 5; j++) {
      phrase += ' ' + words[j];
      phrases.add(phrase);
    }
  }
  
  return Array.from(phrases);
}

function detectFallback(text) {
  const normalizedText = text.toLowerCase();
  
  // Caracteres específicos del español
  if (/[áéíóúñü¿¡]/.test(text)) {
    return 'es';
  }
  
  // Verificar patrones de conjugación española
  if (/\b(voy|vas|va|vamos|van|estoy|está|estamos|están)\b/.test(normalizedText)) {
    return 'es';
  }
  
  // Verificar artículos españoles seguidos de palabras
  if (/\b(el|la|los|las|un|una|unos|unas)\s+\w+/.test(normalizedText)) {
    return 'es';
  }
  
  // Verificar terminaciones verbales españolas comunes
  if (/\w+(ar|er|ir|ando|endo|mente)\b/.test(normalizedText)) {
    return 'es';
  }
  
  // Por defecto, retornar inglés
  return 'en';
}

function postProcessTranslation(text, targetLanguage) {
  try {
    if (!text) return text;
    
    // Mantener la primera letra mayúscula si corresponde
    let processed = text.charAt(0).toUpperCase() + text.slice(1);
    
    // Aplicar reglas específicas según el idioma
    if (targetLanguage === 'en') {
      // En inglés, capitalizar cada palabra en frases como "Good Night"
      processed = processed.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    return processed;
  } catch (e) {
    Logger.log("Error en postProcessTranslation: " + e.message);
    return text;
  }
}

function smartTranslate(text, sourceLanguage) {
  try {
    const normalizedText = normalizeText(text);
    if (!sourceLanguage) {
      sourceLanguage = improvedLanguageDetection(text);
    }
    
    const targetLanguage = sourceLanguage === 'es' ? 'en' : 'es';
    const translationKey = `${sourceLanguage}-${targetLanguage}`;
    
    // 1. Buscar coincidencia exacta
    let translation = findExactMatch(normalizedText, translationKey);
    if (translation) {
      return preserveFormatting(text, translation);
    }
    
    // 2. Intentar traducir con LanguageApp
    translation = LanguageApp.translate(text, sourceLanguage, targetLanguage);
    
    // 3. Verificar si la traducción es válida
    if (!translation || normalizeText(translation) === normalizedText) {
      return "Error: No se pudo traducir el texto. Por favor, inténtalo de nuevo.";
    }
    
    return preserveFormatting(text, translation);
  } catch (e) {
    Logger.log("Error en smartTranslate: " + e.message);
    return "Error en la traducción. Por favor, inténtalo de nuevo.";
  }
}

function preserveCapitalization(original, translation) {
  if (original === original.toUpperCase()) {
    // Si el texto original está completamente en mayúsculas
    return translation.toUpperCase();
  } 
  if (original[0] === original[0].toUpperCase()) {
    // Si solo la primera letra es mayúscula
    return translation.charAt(0).toUpperCase() + translation.slice(1);
  }
  // De lo contrario, devolver la traducción tal cual
  return translation;
}

function sendFormattedTranslation(chatId, original, translation, detectedLanguage) {
  // Invertimos la lógica de las banderas ya que estaba al revés
  const sourceLang = detectedLanguage === 'es' ? '🇪🇸' : '🇺🇸';
  const targetLang = detectedLanguage === 'es' ? '🇺🇸' : '🇪🇸';
  
  // Verificar que la traducción sea diferente del original
  if (normalizeText(original) === normalizeText(translation)) {
    // Si son iguales, intentar traducir nuevamente
    const targetLanguage = detectedLanguage === 'es' ? 'en' : 'es';
    translation = LanguageApp.translate(original, detectedLanguage, targetLanguage);
  }
  
  const message = `${sourceLang} Original:\n${original}\n\n${targetLang} Traducción:\n${translation}`;
  sendTelegramMessage(chatId, message);
}

function findInCustomDictionary(text, translationKey) {
  // Buscar coincidencia exacta
  if (CUSTOM_TRANSLATIONS[translationKey][text]) {
    return CUSTOM_TRANSLATIONS[translationKey][text];
  }
  
  // Buscar coincidencias parciales para frases más largas
  const words = text.split(/\s+/);
  for (let i = words.length; i > 0; i--) {
    const phrase = words.slice(0, i).join(' ');
    if (CUSTOM_TRANSLATIONS[translationKey][phrase]) {
      // Si encontramos una coincidencia parcial, traducir el resto
      const remaining = words.slice(i).join(' ');
      if (remaining) {
        const remainingTranslation = LanguageApp.translate(remaining, 
          translationKey.split('-')[0], 
          translationKey.split('-')[1]);
        return `${CUSTOM_TRANSLATIONS[translationKey][phrase]} ${remainingTranslation}`;
      }
      return CUSTOM_TRANSLATIONS[translationKey][phrase];
    }
  }
  
  return null;
}

function preserveFormatting(original, translation) {
  // Preservar mayúsculas/minúsculas
  if (original === original.toUpperCase()) {
    translation = translation.toUpperCase();
  } else if (original[0] === original[0].toUpperCase()) {
    translation = translation.charAt(0).toUpperCase() + translation.slice(1);
  }
  
  // Preservar signos de puntuación españoles
  if (original.startsWith('¿')) translation = '¿' + translation;
  if (original.endsWith('?')) translation = translation + '?';
  if (original.startsWith('¡')) translation = '¡' + translation;
  if (original.endsWith('!')) translation = translation + '!';
  
  return translation;
}

function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[¿?¡!.,]/g, '') // Removemos signos de puntuación españoles e ingleses
    .replace(/\s+/g, ' ')     // Normalizamos espacios múltiples
    .trim();                  // Eliminamos espacios al inicio y final
}

function findExactMatch(text, translationKey) {
  try {
    const translations = getTranslationsFromSheets();
    if (!translations) {
      Logger.log("No se pudieron obtener las traducciones de Sheets");
      return null;
    }
    
    const dictionary = translations[translationKey];
    if (!dictionary) {
      Logger.log(`No se encontró el diccionario para ${translationKey}`);
      return null;
    }
    
    const normalizedText = normalizeText(text);
    Logger.log(`Buscando traducción para: ${normalizedText}`);
    
    // Buscar coincidencia directa
    if (dictionary[normalizedText]) {
      Logger.log(`Encontrada traducción directa: ${dictionary[normalizedText]}`);
      return dictionary[normalizedText];
    }
    
    // Buscar coincidencia normalizando las claves del diccionario
    for (let key in dictionary) {
      if (normalizeText(key) === normalizedText) {
        Logger.log(`Encontrada traducción normalizada: ${dictionary[key]}`);
        return dictionary[key];
      }
    }
    
    Logger.log(`No se encontró traducción para: ${normalizedText}`);
    return null;
  } catch (e) {
    Logger.log("Error en findExactMatch: " + e.message);
    return null;
  }
}

function findPartialMatch(text, translationKey) {
  try {
    const translations = getTranslationsFromSheets();
    if (!translations) return null;
    
    const dictionary = translations[translationKey];
    const words = text.split(' ');
    
    // Generar todas las posibles combinaciones de palabras consecutivas
    for (let length = words.length; length > 0; length--) {
      for (let start = 0; start <= words.length - length; start++) {
        const phrase = words.slice(start, start + length).join(' ');
        const match = findExactMatch(phrase, translationKey);
        
        if (match) {
          const before = words.slice(0, start).join(' ');
          const after = words.slice(start + length).join(' ');
          
          const sourceLang = translationKey.split('-')[0];
          const targetLang = translationKey.split('-')[1];
          
          let translation = [];
          
          if (before) {
            const beforeTranslation = LanguageApp.translate(before, sourceLang, targetLang);
            translation.push(beforeTranslation);
          }
          
          translation.push(match);
          
          if (after) {
            const afterTranslation = LanguageApp.translate(after, sourceLang, targetLang);
            translation.push(afterTranslation);
          }
          
          return translation.join(' ');
        }
      }
    }
    
    return null;
  } catch (e) {
    Logger.log("Error en findPartialMatch: " + e.message);
    return null;
  }
}

function hasSpanishPatterns(text) {
  const normalizedText = text.toLowerCase();
  
  // Patrones verbales españoles comunes
  const spanishVerbalPatterns = [
    /\b(vamos|voy|vas|va|van)\b/,
    /\b(estoy|estas|está|estamos|estan)\b/,
    /\b(tengo|tienes|tiene|tenemos|tienen)\b/,
    /\b(hago|haces|hace|hacemos|hacen)\b/,
    /ar\b/, // terminaciones verbales
    /er\b/,
    /ir\b/,
    /mos\b/,
    /ando\b/,
    /endo\b/
  ];
  
  // Combinaciones de artículos y preposiciones españolas
  const spanishPhrasePatterns = [
    /\b(el|la|los|las|un|una|unos|unas)\s+\w+/,
    /\b(de|del|al|por|para|con|en)\s+\w+/,
    /\b(mi|tu|su|nuestro|nuestra)\s+\w+/
  ];
  
  // Verificar patrones
  for (const pattern of [...spanishVerbalPatterns, ...spanishPhrasePatterns]) {
    if (pattern.test(normalizedText)) {
      return true;
    }
  }
  
  return false;
}

function detectLanguageByWordFrequency(text) {
  const words = text.toLowerCase().split(/\s+/);
  
  // Palabras muy comunes en español (ampliado)
  const spanishCommonWords = new Set([
    'a', 'al', 'algo', 'aquí', 'bien', 'como', 'con', 'de', 'del', 'el', 
    'en', 'es', 'esta', 'están', 'este', 'hay', 'la', 'las', 'lo', 'los', 
    'más', 'me', 'mi', 'muy', 'no', 'nos', 'para', 'por', 'que', 'se',
    'sí', 'sin', 'sobre', 'su', 'sus', 'también', 'te', 'tu', 'un', 'una',
    'uno', 'unos', 'y', 'ya', 'yo'
  ]);
  
  // Palabras muy comunes en inglés
  const englishCommonWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'had', 'has', 'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it',
    'of', 'on', 'that', 'the', 'they', 'this', 'to', 'was', 'were',
    'will', 'with', 'you'
  ]);
  
  let spanishCount = 0;
  let englishCount = 0;
  
  for (const word of words) {
    if (spanishCommonWords.has(word)) spanishCount++;
    if (englishCommonWords.has(word)) englishCount++;
  }
  
  // Ajustar peso para favorecer detección de español
  spanishCount *= 1.2;
  
  if (spanishCount > englishCount) return 'es';
  if (englishCount > spanishCount) return 'en';
  return null;
}

function hasMorphologicalSpanishPatterns(text) {
  const words = text.toLowerCase().split(/\s+/);
  
  // Patrones morfológicos típicos del español
  const spanishMorphology = {
    suffixes: [
      'ción', 'sión', 'dad', 'tad', 'eza', 'ismo', 'ista',
      'ito', 'ita', 'illo', 'illa', 'ico', 'ica', 'able',
      'ible', 'oso', 'osa', 'ante', 'mente', 'ando', 'endo'
    ],
    prefixes: [
      'des', 'pre', 're', 'in', 'im', 'anti', 'sobre',
      'sub', 'trans', 'inter'
    ]
  };
  
  for (const word of words) {
    // Verificar sufijos
    for (const suffix of spanishMorphology.suffixes) {
      if (word.endsWith(suffix)) return true;
    }
    
    // Verificar prefijos
    for (const prefix of spanishMorphology.prefixes) {
      if (word.startsWith(prefix) && word.length > prefix.length + 2) {
        return true;
      }
    }
  }
  
  return false;
}

// Función para exportar el diccionario actual a Sheets
function exportCustomTranslationsToSheets() {
  try {
    const ss = SpreadsheetApp.openByUrl(sheetBot);
    
    // Asegurarse de que las hojas estén inicializadas
    initializeTranslationSheets();
    
    // Exportar es-en
    const esEnSheet = ss.getSheetByName('es-en');
    const esEnData = Object.entries(CUSTOM_TRANSLATIONS['es-en']).map(([key, value]) => [key, value]);
    if (esEnData.length > 0) {
      esEnSheet.getRange(2, 1, esEnData.length, 2).setValues(esEnData);
    }
    
    // Exportar en-es
    const enEsSheet = ss.getSheetByName('en-es');
    const enEsData = Object.entries(CUSTOM_TRANSLATIONS['en-es']).map(([key, value]) => [key, value]);
    if (enEsData.length > 0) {
      enEsSheet.getRange(2, 1, enEsData.length, 2).setValues(enEsData);
    }
    
    return true;
  } catch (e) {
    Logger.log("Error en exportCustomTranslationsToSheets: " + e.message);
    return false;
  }
}

// Cache para almacenar traducciones temporalmente
let translationsCache = null;
let lastCacheUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

function initializeTranslationSheets() {
  try {
    const ss = SpreadsheetApp.openByUrl(sheetBot);
    
    // Crear hojas si no existen
    let esEnSheet = ss.getSheetByName('es-en');
    let enEsSheet = ss.getSheetByName('en-es');
    
    if (!esEnSheet) {
      esEnSheet = ss.insertSheet('es-en');
      esEnSheet.getRange('A1:B1').setValues([['Español', 'English']]);
      esEnSheet.getRange('A1:B1').setBackground('#4a86e8');
      esEnSheet.getRange('A1:B1').setFontWeight('bold');
    }
    
    if (!enEsSheet) {
      enEsSheet = ss.insertSheet('en-es');
      enEsSheet.getRange('A1:B1').setValues([['English', 'Español']]);
      enEsSheet.getRange('A1:B1').setBackground('#4a86e8');
      enEsSheet.getRange('A1:B1').setFontWeight('bold');
    }
    
    // Formato general
    [esEnSheet, enEsSheet].forEach(sheet => {
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, 2);
      sheet.setColumnWidth(1, 250);
      sheet.setColumnWidth(2, 250);
    });
    
    return true;
  } catch (e) {
    Logger.log("Error en initializeTranslationSheets: " + e.message);
    return false;
  }
}

function getTranslationsFromSheets(forceRefresh = false) {
  try {
    // Verificar si podemos usar el cache
    const now = new Date().getTime();
    if (!forceRefresh && translationsCache && lastCacheUpdate && 
        (now - lastCacheUpdate < CACHE_DURATION)) {
      return translationsCache;
    }

    const ss = SpreadsheetApp.openByUrl(sheetBot);
    const translations = {
      'es-en': {},
      'en-es': {}
    };
    
    // Cargar traducciones es-en
    const esEnSheet = ss.getSheetByName('es-en');
    if (esEnSheet) {
      const esEnData = esEnSheet.getDataRange().getValues();
      for (let i = 1; i < esEnData.length; i++) {
        if (esEnData[i][0] && esEnData[i][1]) {
          translations['es-en'][normalizeText(esEnData[i][0])] = esEnData[i][1];
        }
      }
    }
    
    // Cargar traducciones en-es
    const enEsSheet = ss.getSheetByName('en-es');
    if (enEsSheet) {
      const enEsData = enEsSheet.getDataRange().getValues();
      for (let i = 1; i < enEsData.length; i++) {
        if (enEsData[i][0] && enEsData[i][1]) {
          translations['en-es'][normalizeText(enEsData[i][0])] = enEsData[i][1];
        }
      }
    }
    
    // Actualizar cache
    translationsCache = translations;
    lastCacheUpdate = now;
    
    return translations;
  } catch (e) {
    Logger.log("Error en getTranslationsFromSheets: " + e.message);
    // Si hay error, intentar usar el cache si existe
    return translationsCache || null;
  }
}

function addTranslationToSheets(sourceText, targetText, direction) {
  try {
    const ss = SpreadsheetApp.openByUrl(sheetBot);
    const sheetName = direction; // 'es-en' o 'en-es'
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`Hoja ${sheetName} no encontrada`);
      return false;
    }
    
    // Verificar si la traducción ya existe
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (normalizeText(data[i][0]) === normalizeText(sourceText)) {
        // Actualizar traducción existente
        sheet.getRange(i + 1, 2).setValue(targetText);
        translationsCache = null; // Invalidar cache
        return true;
      }
    }
    
    // Agregar nueva traducción
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, 2).setValues([[sourceText, targetText]]);
    translationsCache = null; // Invalidar cache
    return true;
  } catch (e) {
    Logger.log("Error en addTranslationToSheets: " + e.message);
    return false;
  }
}