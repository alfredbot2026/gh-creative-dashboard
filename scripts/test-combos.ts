import fetch from 'node-fetch';

async function testCombo(platform: string, contentType: string) {
  console.log(`Testing ${platform} + ${contentType}...`);
  try {
    const res = await fetch('http://localhost:3000/api/create/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, contentType, variants: 3, generateImages: false })
    });
    
    if (!res.ok) {
      console.error(`❌ Failed: ${res.status} ${res.statusText}`);
      console.error(await res.text());
      return false;
    }
    
    const data = await res.json() as any;
    if (data.variants && data.variants.length === 3) {
      console.log(`✅ Success: 3 variants returned.`);
      return true;
    } else {
      console.error(`❌ Failed: Expected 3 variants, got ${data.variants?.length}`);
      return false;
    }
  } catch (err) {
    console.error(`❌ Error:`, err);
    return false;
  }
}

async function run() {
  const combos = [
    { p: 'reels', c: 'story' },
    { p: 'reels', c: 'sell' },
    { p: 'facebook-ad', c: 'sell' },
    { p: 'facebook-post', c: 'educate' },
    { p: 'youtube', c: 'educate' },
    { p: 'carousel', c: 'prove' },
  ];
  
  for (const {p, c} of combos) {
    await testCombo(p, c);
  }
}

run();