import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("https://skill-tree-diary.vercel.app/api/skills"); 
        const json = await res.json();
        console.log("API 回傳:", json);
        setData(json);
      } catch (err) {
        console.error("抓取失敗:", err);
        setData({ error: err.message });
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <h1>Notion API 測試</h1>

      {/* 顯示錯誤訊息 */}
      {data?.error && <p>❌ 錯誤：{data.error}</p>}

      {/* 顯示技能清單 */}
      <ul>
        {data?.results
          ?.filter(item => !(item.properties["Invisible"]?.checkbox)) // 安全檢查
          .map(item => {
            const name =
              item.properties["Name"].title[0]?.plain_text || "未命名";
            return <li key={item.id}>{name}</li>;
          })}
      </ul>

      {/* 原始 JSON，方便 debug */}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default App;
