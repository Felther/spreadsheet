// importações necessárias para a API do Google Sheets
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
// scope alterado para poder editar planilhas
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// id da planilha.
// planilha de teste no meu drive: '1_doGr26mw141Ay-U5MQZSZbqH7mmHPrrxa1eiq9eZLU'
// planilha passada pela Tunts no email: '158S3OQh-aXsG1DkWashKC-BATikjG2LFqpwsR07pXz4'
const SPREADSHEET_ID = '158S3OQh-aXsG1DkWashKC-BATikjG2LFqpwsR07pXz4';
// aba da planilha com todas as informações
const SPREADSHEET_TAB = 'engenharia_de_software';
// constantes com as possíveis situações do aluno
const FAILED_ABS = 'Reprovado por Falta';
const FAILED_GRADE = 'Reprovado por Nota';
const EXAM = 'Exame Final';
const APPROVED = 'Aprovado';
// constantes com o número de aulas e a porcentagem máxima de faltas
const LECTURE_NR = 60;
const ABS_PERCENT = 0.25;
// credenciais retiradas do arquivo credentials.json gerado pelo quickstart
const CREDENTIALS = {
    "installed":{
        "client_id":"665919445900-9229onqfq8o8s03uu49s5b5kmbfn8pg4.apps.googleusercontent.com",
        "project_id":"quickstart-1567717832968","auth_uri":"https://accounts.google.com/o/oauth2/auth",
        "token_uri":"https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
        "client_secret":"ScguGHEfA7i5UYFOFkcE64DV",
        "redirect_uris":["urn:ietf:wg:oauth:2.0:oob","http://localhost"]
    }
}

// autoriza um cliente com as credenciais e depois chama a API do Google Sheets
authorize(CREDENTIALS, main);

// Função gerada pleo quickstart para autorização
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

// gerenciamento do token de acesso que, uma vez definido, chama a função passada como callback
/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Função principal, utilizada como callback da autorização. É nela em que são feitas as chamadas de processamento
 * dos dados da planilha é feito.
 * 
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function main(auth) {
  let response = [];
  // calculando o número máximo de faltas
  let maxAbs = await abscence(auth);

  console.log(`Número máximo de faltas: ${maxAbs}`);

  response = await students(auth, maxAbs);

  if (response && response.length) {
    updateStudents(auth, response);
  }
}

/**
 * Calcula o número máximo de faltas com base no número de aulas dadas no semetre.
 * 
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function abscence(auth) {
  const sheets = google.sheets({version: 'v4', auth});

  let maxAbs = Math.ceil(LECTURE_NR * ABS_PERCENT); // valor padrão

  try {
    let res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SPREADSHEET_TAB}!A2`,
    })

    response = res.data.values;

    if (response.length) {
      // calculando o número máximo de faltas a partir da segunda linha da planilha assumindo que o formato
      // dela sempre será: "Total de aulas no semestre: 60"
      if (!isNaN(+(response[0][0].split(': ')[1]))) { // fazendo o split da string pra pegar o número de aulas depois do ":"
        lectureNumber = +(response[0][0].split(': ')[1]);
        maxAbs = Math.ceil(+lectureNumber * 0.25);
      }
    }

    return maxAbs;
  } catch (err) {
    console.log('The API returned an error: ' + err);
    console.log(`Using default value for nr of lectures (${LECTURE_NR}) and max abscence (${LECTURE_NR * ABS_PERCENT})`);
    return maxAbs;
  }
}

/**
 * Recupera os alunos e e faz a avaliação das notas e presença.
 * 
 * @param {google.auth.OAuth2} auth Cliente autenticado do Google OAuth.
 * @param {Number} maxAbs Número máximo de faltas.
 */
async function students(auth, maxAbs) {
  const sheets = google.sheets({version: 'v4', auth});
  let response = [];

  // recuperando os alunos, faltas e notas da planilha
  try {
    let res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range:  `${SPREADSHEET_TAB}!A4:H`
    });

    if (res.data.values && res.data.values.length >= 0) {
      response = res.data.values.map(evalRow, { maxAbs: maxAbs });
    } else {
      console.log ('No student data found.');
    }

    return response;
  } catch(err) {
    console.log('The API returned an error: ' + err);
    return;
  }
}

/**
 * Atualiza as informações dos alunos na planilha do Google Sheets.
 * 
 * @param {google.auth.OAuth2} auth Cliente autenticado do Google OAuth.
 * @param {Number} maxAbs Número máximo de faltas.
 */
async function updateStudents(auth, response) {
  const sheets = google.sheets({version: 'v4', auth});

  // atualizando a planilha com as informações calculadas
  try {
    let res = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SPREADSHEET_TAB}!G4:H`,
      valueInputOption: "USER_ENTERED",
      resource: {
          values: response
      }
    })

    if (res.data) {
      console.log(`${res.data.updatedRows} rows were updated.`);
    }
  } catch (err) {
    console.log('The API returned an error: ' + err);
    return;
  }
}

/*
* Calcula a média e define a situação dos alunos utilizando as faltas
* e o número máximo de faltas permitido. Retorna a linha formatada para ser
* inserida em uma planilha através da API.
*
* @param {Object} row linha da planilha
*/
function evalRow(row) {
  let p1 = +row[3];
  let p2 = +row[4];
  let p3 = +row[5];
  let abs = +row[2];
  
  if (isNaN(p1)) {
    p1 = 0;
  }
  
  if (isNaN(p2)) {
    p2 = 0;
  }
  
  if (isNaN(p3)) {
    p3 = 0;
  }

  if (isNaN(abs)) {
    abs = this.maxAbs;
  }
  
  let avg = Math.ceil((p1 +p2 + p3) / 3); // arredondando para o próximo inteiro

  // somente para verificação
  console.log (`Aluno, Média, Faltas: ${row[1]}, ${avg}, ${abs}`);

  // abs = faltas, caso abs seja maior que o número de faltas permitidas, o aluno é reprovado por faltas
  if (abs > this.maxAbs) { 
    return [FAILED_ABS, 0];
  } else {
    // média menor que 50 (5.0) = reprovado por nota
    if (avg < 50) {
      return [FAILED_GRADE, 0];
    // média entre 50 (5.0) e 69 (6.9) = Exame final
    } else if (avg >= 50 && avg < 70) {
      let naf = Math.ceil(100 - avg);

      return [EXAM, naf];
    // média maior que 70 (7.0) = Aprovado
    } else if (avg >= 70) {
      return [APPROVED, 0]
    }
  }
}