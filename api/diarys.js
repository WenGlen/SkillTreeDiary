// /api/dialys.js
export default async function handler(req, res) {
  try {
    const notionToken = process.env.NOTION_TOKEN;
    const dbId = process.env.DIARY_DB_ID;

    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    });

    const data = await response.json();

    const results = data.results.map((item) => {
      const props = item.properties;

      // 日記標題
      const name = props["Title"]?.title?.[0]?.plain_text || "未命名";

      // 內容
      const content = props["Content"]?.rich_text?.map((t) => t.plain_text).join("") || "";

      // 日期
      const date = props["Created Date"]?.created_time || "";

      // E-I-K
      const eik = props["E-I-K"]?.rich_text?.[0]?.plain_text || "";

      // Invisible
      const invisible = props["Invisible"]?.select?.name === "Yes";

      // Link
      const linkName = props["Link-Name"]?.rich_text?.[0]?.plain_text || "";
      const linkUrl = props["Link-URL"]?.url || "";

      // Skills (relation → id 陣列)
      const skills = props["Skills"]?.relation?.map((rel) => rel.id) || [];

      // diary-slug
      const diarySlug = props["Diary-slug"]?.rich_text?.[0]?.plain_text || "";

      return {
        id: item.id,
        diarySlug,
        name,
        date,
        content,
        eik,
        invisible,
        linkName,
        linkUrl,
        skills,
      };
    });

    // 過濾掉 invisible
    const visibleResults = results.filter((d) => !d.invisible);

    res.status(200).json(visibleResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Dialys" });
  }
}
