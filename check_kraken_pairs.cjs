const https = require('https');
https.get('https://api.kraken.com/0/public/AssetPairs', {headers: {'User-Agent': 'Mozilla'}}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
     let pairs = Object.keys(JSON.parse(data).result);
     console.log(pairs.filter(p => p.includes('GBP') || p.includes('JPY') || p.includes('DXY')));
  });
});
