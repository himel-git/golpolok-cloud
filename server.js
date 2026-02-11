const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const app = express();

app.use(express.json());

// Load Universe & Characters
const universe = JSON.parse(fs.readFileSync("universe_memory.json"));
const characters = JSON.parse(fs.readFileSync("characters.json"));

const MODEL = "llama3"; // Ollama or free LLM API

app.post("/generate", async (req, res) => {
  const topic = req.body.topic || "Kamakhya Temple Awakening";

  try {
    // 1️⃣ Generate Script
    const scriptRes = await axios.post("http://localhost:11434/api/generate", {
      model: MODEL,
      prompt: `Write a cinematic Bengali mythological episode about ${topic}. Divide into 5 scenes.`,
      stream: false
    });

    const script = scriptRes.data.response || "Script generation failed";
    fs.writeFileSync("scenes/script.txt", script);

    // 2️⃣ Split Scenes
    const scenes = script.split("\n\n").slice(0, 5);
    scenes.forEach((scene, i) => fs.writeFileSync(`scenes/scene${i+1}.txt`, scene));

    // 3️⃣ Generate Voice (Coqui TTS must be installed on server)
    execSync(`tts --text "${script}" --out_path audio/voice.wav`);

    // 4️⃣ Generate Placeholder Images (replace with SD API later)
    scenes.forEach((scene, i) => {
      const prompt = `
        Maharshi Veerashva, glowing blue eyes, saffron robes, golden aura,
        cinematic temple background, ultra detailed 4K.
        Scene description: ${scene}
      `;
      fs.writeFileSync(`images/prompt${i+1}.txt`, prompt);
      // Optional: Replace this with Stable Diffusion API call
    });

    // 5️⃣ Merge Video (FFmpeg)
    execSync(`
      ffmpeg -y -r 1/6 -i images/scene%d.png -i audio/voice.wav \
      -vf "scale=1080:1920" -c:v libx264 -pix_fmt yuv420p \
      -c:a aac -shortest output/final.mp4
    `);

    res.download("output/final.mp4");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating video: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));