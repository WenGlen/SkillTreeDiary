export default async function handler(req, res) {
  try {
    const notionRes = await fetch(
      `https://api.notion.com/v1/databases/${process.env.SKILLS_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await notionRes.json();

    // 🔑 加上 CORS header，允許 localhost 也能抓
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
}

