const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const SPREADSHEET_ID = '1_doGr26mw141Ay-U5MQZSZbqH7mmHPrrxa1eiq9eZLU';
const SPREADSHEET_TAB = 'engenharia_de_software';
const CREDENTIALS = { // retirado do arquivo credentials.json
    "installed":{
        "client_id":"665919445900-9229onqfq8o8s03uu49s5b5kmbfn8pg4.apps.googleusercontent.com",
        "project_id":"quickstart-1567717832968","auth_uri":"https://accounts.google.com/o/oauth2/auth",
        "token_uri":"https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
        "client_secret":"ScguGHEfA7i5UYFOFkcE64DV",
        "redirect_uris":["urn:ietf:wg:oauth:2.0:oob","http://localhost"]
    }
}

authorize(CREDENTIALS, alunos);

/*
// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), alunos);
});
*/

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
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function alunos(auth) {
    const sheets = google.sheets({version: 'v4', auth});
    let evals = [];

    sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SPREADSHEET_TAB}!A2`,
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);

        let rows = res.data.values;
        
        if(rows.length) {
            // calculando o número máximo de faltas a partir da linha na linha da planilha
            let nrAulas = rows[0][0].split(': ')[1];
            let maxFaltas = +nrAulas * 0.25;
        }
    });

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range:  `${SPREADSHEET_TAB}!A4:H`
        })
        evals = res.data.values.map(evalRow);
    } catch(err) {
        console.log(err);
    }

    /*
    sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range:  `${SPREADSHEET_TAB}!A4:H`,
    }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);

        let rows = res.data.values;

        if (rows.length) {
            return rows.map(evalRow);
            console.log(values);
        } else {
            console.log('No data found.');
        }
    });
    */

    sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SPREADSHEET_TAB}!G4:H`,
        valueInputOption: "USER_ENTERED",
        resource: {
            values: evals
        }
    }, (err, res) => {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        } else {
            console.log('Updated');
        }
    });

    /* exemplo de leitura da planilha
  sheets.spreadsheets.values.get({
    spreadsheetId: '1_doGr26mw141Ay-U5MQZSZbqH7mmHPrrxa1eiq9eZLU',
    range: 'engenharia_de_software!A3:H27',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('Matricula, Aluno e teste:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[1]} e ${row[7]}`);
      });
    } else {
      console.log('No data found.');
    }
  });
  */
}

function evalRow(row) {
    let p1 = +row[3];
    let p2 = +row[4];
    let p3 = +row[5];
    let abs = +row[2];
    let avg = Math.round((p1 +p2 + p3) / 3);

    if (abs > 15) {
        return ["Reprovado por Falta", 0];
    } else {
        if (avg < 50) {
            return ["Reprovado por Nota", 0];
        } else if (avg >= 50 || avg < 70) {
            let naf = Math.round(100 - avg);

            return ["Exame Final", naf];
        } else if (avg >= 70) {
            return ["Aprovado", 0]
        }
    }

    console.log(`(${p1} + ${p2} + ${p3}) / 3 = ${avg}`);
}