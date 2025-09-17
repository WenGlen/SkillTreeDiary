// api/fetchDiarys.js

export async function fetchDiarys() {
  const res = await fetch("https://skill-tree-diary.vercel.app/api/diarys");
  const json = await res.json();

  const mapped = json.results.map((item) => {
    const props = item.properties;
    const eikStr = props["E-I-K"]?.rich_text?.[0]?.plain_text ?? "0-0-0";

    // 解析 E-I-K
    const [e = 0, i = 0, k = 0] = eikStr
      .split("-")
      .map((s) => Number(String(s).trim()) || 0);

    return {
      id: item.id,
      slug: props["diary-slug"]?.rich_text?.[0]?.plain_text || "",
      title: props["Title"]?.title?.[0]?.plain_text || "未命名",
      content: (props["Content"]?.rich_text ?? []).map((t) => t.plain_text).join(""),
      date: props["Created Date"]?.created_time || "",
      eik: { e, i, k },
      linkName: props["Link-Name"]?.rich_text?.[0]?.plain_text || "",
      linkUrl: props["Link-URL"]?.url || "",
      skills: (props["Skills"]?.relation ?? []).map((rel) => rel.id),
      invisible: !!props["Invisible"]?.checkbox,
    };
  });

  // 過濾隱藏的日記
  return mapped.filter((d) => !d.invisible);
}
