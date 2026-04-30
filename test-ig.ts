import axios from "axios";

async function testInstagram() {
  const url = "https://www.instagram.com/p/DU0BEENjR5r/?__a=1&__d=dis";
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      }
    });
    console.log("Status:", res.status);
    console.log(res.data.graphql ? "Found graphql" : "No graphql");
    console.log(res.data.items ? "Found items" : "No items");
  } catch (e) {
    console.error("Catch:", e.message);
  }
}

testInstagram();
