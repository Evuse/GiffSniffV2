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

// Set ffmpeg-static path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route: Extract Video URL
  app.post("/api/extract", async (req, res) => {
    const { url, sessionid } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      };

      if (sessionid) {
        headers["Cookie"] = `sessionid=${sessionid};`;
      }

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
        
        // Strategy 2: Look for JSON script tag
        if (!videoUrl) {
           const scripts = $('script').filter((i, el) => $(el).html()?.includes('v.pinimg.com') || false).toArray();
           for (const script of scripts) {
              const htmlContent = $(script).html() || "";
              const match = htmlContent.match(/https:\/\/v\.pinimg\.com\/videos\/mc\/[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+\.mp4/);
              if (match) {
                 videoUrl = match[0];
                 break;
              }
           }
        }
      } else if (url.includes("instagram.com")) {
        const response = await axios.get(url, {
          headers,
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Strategy 1: og:video tag
        videoUrl = $('meta[property="og:video"]').attr("content");
        title = $('meta[property="og:title"]').attr("content") || "instagram_video";
        
        // Strategy 2: JSON-LD or script tags
        if (!videoUrl) {
            const matches = html.match(/"video_url":"([^"]+)"/);
            if (matches && matches[1]) {
                videoUrl = matches[1].replace(/\\u0026/g, '&');
            }
        }
      } else {
        return res.status(400).json({ error: "Unsupported domain. Provide a Pinterest or Instagram URL." });
      }

      if (!videoUrl) {
         return res.status(404).json({ error: "Could not extract video URL. Make sure it's a valid video post and check Instagram session ID if private/blocked." });
      }

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
    const inputPath = path.join(tempDir, `${tempFileId}.mp4`);
    const outputPath = path.join(tempDir, `${tempFileId}.${format}`); // .mp4 or .gif

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

      } else if (format === "gif") {
         res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.gif"`);
         res.setHeader("Content-Type", "image/gif");
         
         const { width = 480, fps = 15, colors = 256, dither = "sierra2_4a" } = settings || {};
         
         const ditherOpt = dither === "none" ? "none" : dither;
         const vfParams = `scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${colors}[p];[s1][p]paletteuse=dither=${ditherOpt}`;
         
         const convertCmd = ffmpeg(inputPath)
            .outputOptions([
                `-vf`, vfParams,
                `-r`, `${fps}`
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
