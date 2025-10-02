import { useState, useEffect } from "react";

export default function SettingsModal({ show, onClose }) {
  const [apiKey, setApiKey] = useState("");
  const [skillsDbId, setSkillsDbId] = useState("");
  const [diarysDbId, setDiarysDbId] = useState("");

  useEffect(() => {
    setApiKey(localStorage.getItem("notion_api_key") || "");
    setSkillsDbId(localStorage.getItem("skills_db_id") || "");
    setDiarysDbId(localStorage.getItem("diarys_db_id") || "");
  }, []);

  const handleSave = () => {
    localStorage.setItem("notion_api_key", apiKey.trim());
    localStorage.setItem("skills_db_id", skillsDbId.trim());
    localStorage.setItem("diarys_db_id", diarysDbId.trim());
    onClose();
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <div style={{
        width: 420, maxWidth: "92%", background: "#1f2937", color: "#fff",
        padding: 20, borderRadius: 10, border: "1px solid #333", position: "relative"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 8, right: 10, background: "transparent",
          border: "none", color: "#fff", fontSize: 18, cursor: "pointer"
        }}>✕</button>

        <h2 style={{ margin: "0 0 12px" }}>Notion API 設定</h2>

        <label style={{ fontSize: 12 }}>API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="secret_xxx..."
          style={inputStyle}
        />

        <label style={{ fontSize: 12 }}>Skills Database ID</label>
        <input
          type="text"
          value={skillsDbId}
          onChange={(e) => setSkillsDbId(e.target.value)}
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          style={inputStyle}
        />

        <label style={{ fontSize: 12 }}>Diarys Database ID</label>
        <input
          type="text"
          value={diarysDbId}
          onChange={(e) => setDiarysDbId(e.target.value)}
          placeholder="yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
          style={inputStyle}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose}>取消</button>
          <button onClick={handleSave} style={{
            background: "#00aaaa", color: "#fff", border: "none",
            borderRadius: 6, padding: "6px 12px", cursor: "pointer"
          }}>保存</button>
        </div>

        <p style={{ color: "#bbb", fontSize: 12, marginTop: 10 }}>
          ⚠️ 金鑰僅儲存在你的瀏覽器（localStorage），請勿分享給他人。
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", margin: "6px 0 14px",
  borderRadius: 6, border: "1px solid #555", background: "#111", color: "#fff"
};
