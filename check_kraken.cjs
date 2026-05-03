const https = require('https');
https.get('https://api.kraken.com/0/public/OHLC?pair=GBPUSD&interval=1', {headers: {'User-Agent': 'Mozilla'}}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 500)));
});
