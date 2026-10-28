// Read-only UTF-8 stub: one JSON object on stdout, one Chinese diagnostic on
// stderr. It reads no credential, environment, Store or network.
const quote=String.fromCharCode(34);
const payload='中文'+quote+'引号'+quote+'与反斜杠\\和换行\n第二行\r\n第三行😀🌙𠀋';
process.stdout.write(JSON.stringify({schemaVersion:1,payload})+'\n');
process.stderr.write('stderr:'+payload+'\n');
