import "dotenv/config";
import puppeteer from "puppeteer";
import { readdir, mkdir, readFile, access } from "node:fs/promises";

const template = await readFile("tools/og.html", "utf-8");

const browser = await puppeteer.launch({
  args: ["--no-sandbox"],
  executablePath: process.env.PUPPETEER_EXEC_PATH,
});

async function og(postname, type, by, outputPath, width = 1200, height = 630) {
  const page = await browser.newPage();

  await page.setViewport({ width, height });

  await page.setContent(
    template
      .toString()
      .replace("{{postname}}", postname)
      .replace("{{type}}", type)
      .replace("{{by}}", by || ""),
  );

  await page.screenshot({ path: outputPath });
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch (e) {
    return false;
  }
}

try {
  // check if the public/blog folder exists
  // if not exit
  // if it does, get all the folders and then get the title tag from the index.html

  if (!(await fileExists("public/"))) {
    console.error("public/ does not exist");
    process.exit(1);
  }

  // read all the files in the current directory filtering for index.htmls
  const files = (await readdir("public/", { recursive: true })).filter((file) =>
    file.endsWith("index.html"),
  );

  const directories = new Set(
    files.map((file) => file.replace("index.html", "")),
  );

  const existing = (await readdir("static/")).filter((file) =>
    directories.has(file),
  );

  // create not existing
  for (const dir of directories) {
    if (!existing.includes(dir)) {
      await mkdir(`static/${dir.split("/").slice(0, -1).join("/")}`, {
        recursive: true,
      });
    }
  }

  console.log("Generating OG images for", files.length, "files");

  // for each file, get the title tag from the index.html
  for (const file of files) {
    const index = await readFile(`public/${file}`, "utf-8");
    const title = index.match(/<title>(.*?)<\/title>/)?.[1] ?? "Untitled";
    let type = "Page";
    let by;
    switch (file.split("/")[0]) {
      case "blog":
        type = "Blog";
        if (file.split("/")[1] !== "index.html") {
          by = "<p>A post ... yeah thats about it</p>";
        } else {
          by = "<p>All authored by me ... or are they???</p>";
        }
        break;
      case "verify":
        type = "Slash Page";
        by = "<p>So you can stalk me 💀</p>";
        break;
      case "pfp":
        type = "Slash Page";
        by = "<p>Want to stare at my pretty face?</p>";
        break;
      case "tags":
        if (file.split("/")[1] === "index.html") {
          type = "Tags";
          by = "<p>A total archive!</p>";
        } else {
          type = "Tag";
          by = "<p>Find more posts like this!</p>";
        }
        break;
      case "index.html":
        type = "Root";
        by = "<p>Where it all begins</p>";
        break;
    }

    console.log("Generating OG for", file, "title:", title, "with type:", type);
    await og(title, type, by, `static/${file.replace("index.html", "og.png")}`);
  }
} catch (e) {
  console.error(e);
} finally {
  await browser.close();
}
