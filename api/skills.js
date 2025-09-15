// api/skills.js
export default async function handler(req, res) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const SKILLS_DB_ID = process.env.SKILLS_DB_ID;

  const notionRes = await fetch(
    `https://api.notion.com/v1/databases/${SKILLS_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    }
  );

  const data = await notionRes.json();
  res.status(200).json(data);
}
