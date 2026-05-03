const https = require('https');
https.get('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1m&range=1d', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 200)));
});
