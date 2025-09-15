

import { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {

      const res = await fetch("/api/skills"); 
      const data = await res.json();
      setData(data);
      
      const json = await res.json();
      setData(json);

    }
    fetchData();
  }, []);

  return (
    <div>
      <h1>Notion API 測試</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <p>{import.meta.env.VITE_NOTION_TOKEN}</p>
      <p>{import.meta.env.VITE_SKILLS_DB_ID}</p>
    </div>
  );
}

export default App;