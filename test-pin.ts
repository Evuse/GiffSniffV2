import axios from "axios";
import * as cheerio from "cheerio";

async function testPinterest() {
  const url = "https://it.pinterest.com/pin/68749119212/";
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });
    console.log("Status:", res.status);
    const html = res.data;
    console.log("HTML length:", html.length);
    console.log("meta og:video:", cheerio.load(html)('meta[property="og:video"]').attr("content"));
    
    // Look for any .mp4 URL
    const match = html.match(/https:\/\/[^"']+\.mp4/g);
    console.log("MP4 URLs:", match ? Array.from(new Set(match)).slice(0, 5) : "none");

    const jsonMatch = html.match(/"contentUrl":"([^"]+)"/);
    console.log("contentUrl:", jsonMatch ? jsonMatch[1] : "none");

  } catch (e) {
    console.error(e);
  }
}

testPinterest();
