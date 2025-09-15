import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/skills");   // 呼叫 Vercel proxy
        const json = await res.json();            // 解析一次就夠
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
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default App;
