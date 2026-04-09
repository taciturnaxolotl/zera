import puppeteer from "puppeteer";
import { readdir, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";

const fontsPath = `file://${resolve("static/fonts")}`;
const template = (await Bun.file("scripts/og.html").text()).replace(
	/\{\{fontsPath\}\}/g,
	fontsPath,
);

const browser = await puppeteer.launch({
  args: ["--no-sandbox"],
  executablePath: process.env.PUPPETEER_EXEC_PATH, // set by docker container
});

async function og(
	postname: string,
	type: string,
	outputPath: string,
	width = 1200,
	height = 630,
) {
	const page = await browser.newPage();

	await page.setViewport({ width, height });

	await page.setContent(
		template
			.toString()
			.replace("{{postname}}", postname)
			.replace("{{type}}", type),
		{ waitUntil: "load" },
	);

	await page.screenshot({ path: outputPath });
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

try {
	if (!(await pathExists("public/"))) {
		console.error("public/ does not exist");
		process.exit(1);
	}

	const files = (await readdir("public/", { recursive: true })).filter((file) =>
		file.endsWith("index.html"),
	);

	const directories = new Set(
		files.map((file) => file.replace("index.html", "")),
	);

	const existing = (await readdir("static/")).filter((file) =>
		directories.has(file),
	);

	for (const dir of directories) {
		if (!existing.includes(dir)) {
			await mkdir(`static/${dir.split("/").slice(0, -1).join("/")}`, {
				recursive: true,
			});
		}
	}

	console.log("Generating OG images for", files.length, "files");

	const tasks = files.map((file) => async () => {
		const index = await Bun.file(`public/${file}`).text();
		const title = index.match(/<title>(.*?)<\/title>/)[1];
		let type = "Page";
		switch (file.split("/")[0]) {
			case "blog":
				type = file.split("/")[1] !== "index.html" ? "Blog" : "Blog Index";
				break;
			case "verify":
				type = "Slash Page";
				break;
			case "pfp":
				type = "Slash Page";
				break;
			case "tags":
				type = file.split("/")[1] === "index.html" ? "Tags" : "Tag";
				break;
			case "index.html":
				type = "Root";
				break;
		}

		console.log("Generating OG for", file, "title:", title, "with type:", type);
		await og(title, type, `static/${file.replace("index.html", "og.png")}`);
	});

	for (let i = 0; i < tasks.length; i += 10) {
		await Promise.all(tasks.slice(i, i + 10).map((t) => t()));
	}
} catch (e) {
	console.error(e);
} finally {
	await browser.close();
}
