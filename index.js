// Load token from .env file
require("dotenv").config();
// Import necessary Discord.js classes
const { Client, Intents } = require("discord.js");
// Instantiate new client object with desired Intents
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
// Authenticate
client.login(process.env.TOKEN);
// Notify successful connection via console
client.on("ready", function (e) {
  console.log(`Logged in as ${client.user.tag}!`);
});

const locateChrome = require("locate-chrome");

const puppeteer = require("puppeteer");
const url = "https://urzas.ai";

async function generateCardURL(cardName) {
  const executablePath = await new Promise((resolve) =>
    locateChrome((arg) => resolve(arg))
  );
  const browser = await puppeteer.launch({
    executablePath,
    ignoreDefaultArgs: ["--disable-extensions"],
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.type("input", cardName);
  try {
    const [response] = await Promise.all([
      page.waitForNavigation(),
      page.click("#action-button"),
    ]);
    const cardId = response.url().split("card_id=").pop();
    await browser.close();
    return `https://urzas-ai-prod.s3.amazonaws.com/images/${cardId}.png`;
  } catch (e) {
    await browser.close();
    return "sry sry your card was shitty and it didn't work";
  }
}

// Wait for message events, check content for match,
// respond cordially to user via reply.
client.on("message", (msg) => {
  if (msg.content.startsWith(";;urza")) {
    try {
      console.log(msg.content);
      const cardURL = generateCardURL(msg.content.substring(6)).then((url) => {
        msg.reply(url);
      });
    } catch (e) {
      msg.reply("sry sry your card was shitty and it didn't work");
    }
  } else {
    handleMessage(message);
  }
});

const unvotedDir = "C:/Users/brent/Dropbox/Urzas.ai Cards/aiCards/";
const votedYesDir = "C:/Users/brent/Dropbox/Urzas.ai Cards/yes/";
const votedNoDir = "C:/Users/brent/Dropbox/Urzas.ai Cards/no/";

let currentFolder;
let currentImg;

//passsing directoryPath and callback function
const copyToVoteFolder = (src, dest) => {
  fs.rename(src, dest, (err) => {
    if (err) throw err;
    console.log(`${src} was copied to ${dest}`);
  });
};

const setCard = async () => {
  const files = fs.readdirSync(unvotedDir);

  currentFolder = files.find((dir) => {
    return (
      !dir.includes("desktop.ini") &&
      fs.readdirSync(unvotedDir + dir).length > 0
    );
  });
  if (currentFolder) {
    console.log(currentFolder);
    currentImg = fs.readdirSync(unvotedDir + currentFolder)[0];
    console.log(currentImg);
  }
};

const handleMessage = async (message) => {
  if (message.content.toLowerCase().startsWith("!vote")) {
    await setCard();
    const embed = new MessageEmbed().setTimestamp();
    embed.setTitle("Voting on the below card");
    embed.setColor("#0099ff");
    embed.setImage(
      `https://urzas-ai-prod.s3.amazonaws.com/images/${currentImg}`
    );
    try {
      const polls = new Map();
      const userVotes = new Map();
      let filter = (reaction, user) => {
        if (user.bot) return false;
        if (["👍", "👎"].includes(reaction.emoji.name)) {
          if (polls.get(reaction.message.id).get(user.id)) {
            return false;
          } else {
            userVotes.set(user.id, reaction.emoji.name);
            return true;
          }
        }
      };
      let msg = await message.channel.send({ embeds: [embed] });
      await msg.react("👍");
      await msg.react("👎");
      polls.set(msg.id, userVotes);
      const collector = msg.createReactionCollector({ filter });
      collector.on("collect", async (reaction, user) => {
        if (msg.reactions.cache.get("👍").count === 3) {
          message.channel.send(
            `this card is in.\nhttps://urzas-ai-prod.s3.amazonaws.com/images/${currentImg}`
          );
          copyToVoteFolder(
            unvotedDir + currentFolder + "/" + currentImg,
            votedYesDir + currentFolder + "/" + currentImg
          );
          msg.delete();
          await handleMessage(message);
        }
        if (msg.reactions.cache.get("👎").count === 3) {
          message.channel.send(
            `this card is out.\nhttps://urzas-ai-prod.s3.amazonaws.com/images/${currentImg}`
          );
          copyToVoteFolder(
            unvotedDir + currentFolder + "/" + currentImg,
            votedNoDir + currentFolder + "/" + currentImg
          );
          msg.delete();
          await handleMessage(message);
        }
      });
    } catch (err) {
      console.log(err);
    }
  }
};

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
