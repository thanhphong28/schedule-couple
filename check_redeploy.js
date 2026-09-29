import fs from 'fs';

async function check() {
  const res = await fetch('https://schedule-couple.vercel.app/');
  const html = await res.text();
  const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (match) {
    console.log("Current bundle:", match[1]);
    const jsRes = await fetch('https://schedule-couple.vercel.app' + match[1]);
    const jsText = await jsRes.text();
    const idx = jsText.indexOf('supabase.co');
    if (idx !== -1) {
      console.log("Context around supabase.co:");
      console.log(jsText.substring(idx - 50, idx + 50));
    } else {
      console.log("supabase.co not found!");
    }
    const idx2 = jsText.indexOf('ilqguqoskukuqnrsiijn');
    if (idx2 !== -1) {
      console.log("Found correct project ID!");
    } else if (jsText.indexOf('ilqguqoskukuqnrsijn') !== -1) {
      console.log("Found WRONG project ID (missing i)!");
    }
  }
}
check();
