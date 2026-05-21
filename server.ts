import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import cors from "cors";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { instagramGetUrl } from "instagram-url-direct";

// Set ffmpeg-static path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const extractionCache = new Map<string, { videoUrl: string, title: string, timestamp: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route: Extract Video URL
  app.post("/api/extract", async (req, res) => {
    const { url, sessionid, dribbbleSession } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    // Check cache first
    const cached = extractionCache.get(url);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) { // 1 hour cache
        console.log(`Using cached extraction for ${url}`);
        return res.json({ videoUrl: cached.videoUrl, title: cached.title });
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Mode": "navigate"
      };

      console.log(`Extracting from: ${url}`);
      let videoUrl = null;
      let title = "video";

      if (url.includes("pinterest.com") || url.includes("pin.it")) {
        const response = await axios.get(url, {
          headers,
          maxRedirects: 5,
          validateStatus: (status) => status < 500, // Handle redirects manually if needed
        });
        
        let html = response.data;
        const $ = cheerio.load(html);
        
        // Strategy 1: Look for og:video attribute
        videoUrl = $('meta[property="og:video"]').attr("content") || $('meta[name="og:video"]').attr("content");
        title = $('meta[property="og:title"]').attr("content") || "pinterest_video";
        
        // Strategy 2: Look for any mp4 link
        if (!videoUrl) {
           const match = html.match(/https:(?:\\\/\\\/|\/\/)[^"']+\.mp4/g);
           if (match) {
               const mp4s = Array.from(new Set(match)).map((u: any) => u.replace(/\\/g, ''));
               const expMp4 = mp4s.filter(u => u.includes('expMp4') || !u.includes('hevc'));
               
               const bestMatch = expMp4.find(u => u.includes('720')) || 
                                 expMp4.find(u => u.includes('480')) || 
                                 expMp4[0] || 
                                 mp4s[0];
               videoUrl = bestMatch;
           }
        }
        
        // Strategy 3: contentUrl JSON
        if (!videoUrl) {
           const jsonMatch = html.match(/"contentUrl"\s*:\s*"([^"]+)"/);
           if (jsonMatch && jsonMatch[1]) {
               videoUrl = jsonMatch[1].replace(/\\/g, '');
           }
        }
        
        // Strategy 4: Fallback to GIF or Image
        if (!videoUrl) {
            const gifMatch = html.match(/https:(?:\\\/\\\/|\/\/)[^"']+\.gif\b/g);
            if (gifMatch) {
               videoUrl = (Array.from(new Set(gifMatch))[0] as string).replace(/\\/g, '');
            } else {
               videoUrl = $('meta[property="og:image"]').attr("content");
            }
        }
      } else if (url.includes("instagram.com")) {
        
        const tryHtmlExtraction = async () => {
            const customHeaders = { ...headers };
            if (sessionid) {
                // Remove spaces and make sure the format is right
                const cleanSessionId = sessionid.trim().replace(/^sessionid=/, '');
                customHeaders["Cookie"] = `sessionid=${cleanSessionId};`;
            }
            try {
                const response = await axios.get(url, { headers: customHeaders, validateStatus: () => true });
                if (response.status === 200 && typeof response.data === 'string') {
                    const html = response.data;
                    const $ = cheerio.load(html);
                    let vUrl = $('meta[property="og:video"]').attr("content");
                    
                    if (!vUrl) {
                        const match = html.match(/"video_url"\s*:\s*"([^"]+)"/);
                        if (match && match[1]) {
                            vUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
                        }
                    }
                    if (!vUrl) {
                        const fallbacks = html.match(/"url"\s*:\s*"([^"]+\.mp4[^"]*)"/g);
                        if (fallbacks) {
                            for (const f of fallbacks) {
                                const matchedUrl = f.match(/"url"\s*:\s*"([^"]+)"/);
                                if (matchedUrl && matchedUrl[1] && matchedUrl[1].includes('.mp4')) {
                                    vUrl = matchedUrl[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (!vUrl) {
                        const gifMatch = html.match(/https:(?:\\\/\\\/|\/\/)[^"']+\.gif\b/g);
                        if (gifMatch) {
                            vUrl = (Array.from(new Set(gifMatch))[0] as string).replace(/\\/g, '');
                        } else {
                            const ogImage = $('meta[property="og:image"]').attr("content");
                            if (ogImage && !ogImage.includes('rsrc.php')) vUrl = ogImage;
                        }
                    }
                    return vUrl;
                }
            } catch (e) {
                console.error("HTML Extraction Error:", e);
            }
            return null;
        };

        try {
            // Strategy 1: User's sessionid HTML
            if (sessionid) {
                console.log("Attempting Instagram HTML extraction with sessionid...");
                videoUrl = await tryHtmlExtraction();
            }

            // Strategy 2: instagram-url-direct module fallback
            if (!videoUrl) {
                console.log("Attempting instagram-url-direct library...");
                const igResult = await instagramGetUrl(url);
                if (igResult && igResult.url_list && igResult.url_list.length > 0) {
                   videoUrl = igResult.url_list[0];
                   title = (igResult.post_info && igResult.post_info.owner_username) ? `ig_${igResult.post_info.owner_username}` : "instagram_video";
                }
            }

            // Strategy 3: Public HTML extraction
            if (!videoUrl && !sessionid) {
                 console.log("Attempting public Instagram HTML extraction...");
                 videoUrl = await tryHtmlExtraction();
            }
        } catch (igError) {
            console.error("Instagram extraction error:", igError);
            if (!videoUrl && !sessionid) {
                 videoUrl = await tryHtmlExtraction();
            }
        }
      } else if (url.includes("dribbble.com")) {
        console.log("Attempting Dribbble extraction...");
        if (dribbbleSession) {
             headers["Cookie"] = dribbbleSession.includes("=") ? dribbbleSession : `_dribbble_session=${dribbbleSession}`;
        }
        const response = await axios.get(url, {
          headers,
          validateStatus: (status) => status < 500
        });

        let html = typeof response.data === 'string' ? response.data : "";
        
        if (html.includes("challenge-container")) {
             console.warn("Dribbble AWS WAF challenge encountered. HTML might be incomplete without proxy.");
             return res.status(403).json({ error: "Access blocked by Dribbble's security challenge (WAF). Provide a Dribbble Session ID in Settings to bypass." });
        }

        const $ = cheerio.load(html);
        
        // 1. OG Video tag
        videoUrl = $('meta[property="og:video"]').attr("content") || $('meta[name="twitter:player:stream"]').attr("content");
        title = $('meta[property="og:title"]').attr("content") || "dribbble_shot";
        
        // 2. Video source tag
        if (!videoUrl) {
            const sourceMatch = html.match(/<source[^>]+src="([^"]+\.mp4[^"]*)"/);
            if (sourceMatch && sourceMatch[1]) {
                videoUrl = sourceMatch[1];
            }
        }
        
        // 3. Raw mp4 links in HTML body
        if (!videoUrl) {
            const mp4Match = html.match(/https:\/\/[^"']*\.dribbble\.com\/[^"']+\.mp4/g);
            if (mp4Match) {
               videoUrl = mp4Match[0];
            }
        }
        
        // 4. Fallback to GIF or static image
        if (!videoUrl) {
            const gifMatch = html.match(/https:\/\/[^"']*\.dribbble\.com\/[^"']+\.gif/g);
            if (gifMatch) {
               videoUrl = gifMatch[0];
            } else {
               videoUrl = $('meta[property="og:image"]').attr("content");
            }
        }
      } else {
        return res.status(400).json({ error: "Unsupported domain. Provide a Pinterest, Instagram, or Dribbble URL." });
      }

      if (!videoUrl) {
         let errorMsg = "Could not extract media URL. Make sure it's a valid post/shot.";
         if (url.includes("instagram.com")) {
             errorMsg += " Check Instagram session ID if private/blocked.";
         } else if (url.includes("dribbble.com")) {
             errorMsg += " Dribbble AWS WAF challenge might be blocking requests. Try setting a Dribbble Session ID.";
         }
         return res.status(404).json({ error: errorMsg });
      }
      
      extractionCache.set(url, { videoUrl, title, timestamp: Date.now() });

      return res.json({ videoUrl, title });

    } catch (err: any) {
      console.error("Extraction error:", err.message);
      return res.status(500).json({ error: "Failed to fetch or parse the provided URL." });
    }
  });

  // API Route: Process & Download
  app.post("/api/download", async (req, res) => {
    const { videoUrl, format, settings, title } = req.body;

    if (!videoUrl) return res.status(400).json({ error: "No video URL provided." });

    const tempDir = os.tmpdir();
    const tempFileId = crypto.randomUUID();
    const inputPath = path.join(tempDir, `${tempFileId}_input`); // without extension so ffmpeg detects
    const outputPath = path.join(tempDir, `${tempFileId}.${format === 'image' ? 'jpg' : format}`); // .mp4, .gif, .jpg

    try {
      // 1. Download video to temp storage
      const response = await axios.get(videoUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(inputPath);
      
      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        let error: Error | null = null;
        writer.on('error', err => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on('close', () => {
          if (!error) resolve(true);
        });
      });

      // 2. Format and send
      const safeTitle = (title || "download").replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);

      if (format === "mp4") {
         const { quality = "original", width, fps } = settings || {};

         if (quality === "original" && !width && !fps) {
             res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp4"`);
             res.setHeader("Content-Type", "video/mp4");
             
             const readStream = fs.createReadStream(inputPath);
             readStream.pipe(res);
             
             readStream.on("end", () => {
                 fs.unlink(inputPath, () => {});
             });
             return;
         }

         res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}_compressed.mp4"`);
         res.setHeader("Content-Type", "video/mp4");

         let crf = 23; // default high
         if (quality === "medium") crf = 28;
         if (quality === "low") crf = 35;

         const outputOptions = ['-c:v', 'libx264', `-crf`, `${crf}`, '-preset', 'fast', '-c:a', 'aac', '-b:a', '128k'];
         
         if (width && width > 0) outputOptions.push('-vf', `scale=${width}:-2`);
         if (fps && fps > 0) outputOptions.push('-r', `${fps}`);

         ffmpeg(inputPath)
            .outputOptions(outputOptions)
            .toFormat("mp4")
            .on("error", (err) => {
               console.error("FFmpeg error:", err);
               if (!res.headersSent) res.status(500).json({ error: "Error compressing video" });
               fs.unlink(inputPath, () => {});
            })
            .on("end", () => {
               const readStream = fs.createReadStream(outputPath);
               readStream.pipe(res);
               readStream.on("end", () => {
                   fs.unlink(inputPath, () => {});
                   fs.unlink(outputPath, () => {});
               });
            })
            .save(outputPath);

      } else if (format === "image") {
         const { width = 0, quality = "original" } = settings || {};
         
         if (quality === "original" && (!width || width === 0)) {
             res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.jpg"`);
             res.setHeader("Content-Type", "image/jpeg");
             
             const readStream = fs.createReadStream(inputPath);
             readStream.pipe(res);
             
             readStream.on("end", () => {
                 fs.unlink(inputPath, () => {});
             });
             return;
         }

         res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}_resized.jpg"`);
         res.setHeader("Content-Type", "image/jpeg");

         let qscale = 2; // high
         if (quality === "medium") qscale = 5;
         if (quality === "low") qscale = 10;
         
         const outputOptions = [`-q:v`, `${qscale}`];
         if (width && width > 0) outputOptions.push('-vf', `scale=${width}:-1`);

         ffmpeg(inputPath)
            .outputOptions(outputOptions)
            .toFormat("image2")
            .on("error", (err) => {
               console.error("FFmpeg error:", err);
               if (!res.headersSent) res.status(500).json({ error: "Error processing image" });
               fs.unlink(inputPath, () => {});
            })
            .on("end", () => {
               const readStream = fs.createReadStream(outputPath);
               readStream.pipe(res);
               readStream.on("end", () => {
                   fs.unlink(inputPath, () => {});
                   fs.unlink(outputPath, () => {});
               });
            })
            .save(outputPath);

      } else if (format === "gif") {
         res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.gif"`);
         res.setHeader("Content-Type", "image/gif");
         
         const { width = 480, fps = 15, colors = 256, dither = "sierra2_4a" } = settings || {};
         
         const ditherOpt = dither === "none" ? "none" : dither;
         // Use fast_bilinear and stats_mode=single for massive speed improvements in GIF generation
         const vfParams = `scale=${width}:-1:flags=fast_bilinear,split[s0][s1];[s0]palettegen=max_colors=${colors}:stats_mode=single[p];[s1][p]paletteuse=dither=${ditherOpt}`;
         
         const convertCmd = ffmpeg(inputPath)
            .outputOptions([
                `-vf`, vfParams,
                `-r`, `${fps}`,
                `-threads`, `0`
            ])
            .toFormat("gif")
            .on("error", (err) => {
               console.error("FFmpeg error:", err);
               if (!res.headersSent) {
                   res.status(500).json({ error: "Error converting video to GIF" });
               }
               fs.unlink(inputPath, () => {});
            })
            .on("end", () => {
               const readStream = fs.createReadStream(outputPath);
               readStream.pipe(res);
               readStream.on("end", () => {
                   fs.unlink(inputPath, () => {});
                   fs.unlink(outputPath, () => {});
               });
            });
            
         convertCmd.save(outputPath);
      } else {
         return res.status(400).json({ error: "Invalid format. Use mp4 or gif." });
      }

    } catch (err: any) {
      console.error("Download error:", err.message);
      return res.status(500).json({ error: "Failed to download or process video." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
