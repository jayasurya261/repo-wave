import http from 'http';

http.get('http://localhost:4321/sitemap.xml', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    if (res.statusCode !== 200) {
      console.log('Error: Server returned', res.statusCode);
      console.log('Body:', data.substring(0, 500));
      return;
    }
    
    // Check first 100 characters
    console.log('--- START OF FILE ---');
    console.log(data.substring(0, 100));
    console.log('--- END OF START ---');
    
    // Check for trailing spaces
    console.log('Ends with whitespace?', /\s$/.test(data));
    
    // Simple basic check for well-formedness: Do we have matching counts?
    const urls = data.match(/<url>/g)?.length || 0;
    const urlC = data.match(/<\/url>/g)?.length || 0;
    console.log('Opening <url> count:', urls);
    console.log('Closing </url> count:', urlC);
    
    // Any unescaped ampersands in URLs?
    const invalidAmp = data.match(/<loc>[^<]*&(?!(?:amp|lt|gt|quot|apos);)[^<]*<\/loc>/g);
    if (invalidAmp) {
      console.log('Found unescaped ampersands:', invalidAmp.slice(0, 5));
    } else {
      console.log('No unescaped ampersands found.');
    }
  });
}).on('error', err => {
  console.log('Error:', err.message);
});
