import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ No OPENAI_API_KEY found in .env");
  process.exit(1);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log("📂 Created folder:", dirPath);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadMonth(monthFile) {
  const data = fs.readFileSync(monthFile, "utf8");
  return JSON.parse(data);
}

// Generate one MP3 if it doesn't already exist
async function generateItem(kind, dir, item) {
  const outFile = path.join(dir, item.file + ".mp3");

  if (fs.existsSync(outFile)) {
    console.log(`⏭️  Skipping existing ${kind}: ${outFile}`);
    return;
  }

  console.log(`🎙️  Generating ${kind}: ${outFile}`);
  console.log(`    Text: "${item.text}"`);

  try {
    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "sage",
      format: "mp3",
      input: item.text
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outFile, buffer);
    console.log(`✅ Saved ${kind}: ${outFile}`);

    // 8 second pause between requests (your rule)
    await sleep(8000);
  } catch (err) {
    console.error(`❌ Error generating ${kind} (${item.file}):`, err?.message || err);
  }
}

async function main() {
  const month = loadMonth("./content/january.json");
  console.log(`🚀 Starting Sage generation for ${month.month} ${month.year}`);

  const outputBase = "./output";

  for (const [weekName, weekData] of Object.entries(month.weeks)) {
    console.log(`\n📅 Week: ${weekName}`);

    const weekPath = path.join(outputBase, weekName);
    ensureDir(weekPath);

    const vocabDir = path.join(weekPath, "vocab");
    const sentencesDir = path.join(weekPath, "sentences");
    const questionsDir = path.join(weekPath, "questions");

    ensureDir(vocabDir);
    ensureDir(sentencesDir);
    ensureDir(questionsDir);

    for (const item of weekData.vocab || []) {
      await generateItem("vocab", vocabDir, item);
    }

    for (const item of weekData.sentences || []) {
      await generateItem("sentence", sentencesDir, item);
    }

    for (const item of weekData.questions || []) {
      await generateItem("question", questionsDir, item);
    }
  }

  console.log("\n🎉 All done for this month.");
}

main();
