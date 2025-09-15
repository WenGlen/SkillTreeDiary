import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("https://skill-tree-diary.vercel.app/api/skills"); // 呼叫 Vercel proxy
        const json = await res.json();
        console.log("API 回傳:", json); // 除錯用
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

      {/* 顯示清單 */}
      <ul>
        {data?.results
          ?.filter(item => !item.properties["Invisible"].checkbox) // 過濾掉 Invisible
          .map(item => {
            const name =
              item.properties["Name"].title[0]?.plain_text || "未命名";
            return <li key={item.id}>{name}</li>;
          })}
      </ul>

      {/* 原始 JSON 也一起顯示，方便 debug */}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default App;
