import { useState } from "react";

export default function StartExam({ onStart }) {

  const [name, setName] = useState("");
  const [examCode, setExamCode] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim() || !examCode.trim()) {
      alert("Please enter name and exam code");
      return;
    }

    onStart(name, examCode);
  };


  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "monospace",
      }}
    >

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#1e293b",
          padding: "30px",
          borderRadius: "12px",
          width: "320px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >

        <h2 style={{ color: "#38bdf8" }}>
          🛡️ ExamGuard
        </h2>


        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "none",
          }}
        />


        <input
          type="text"
          placeholder="Enter exam code"
          value={examCode}
          onChange={(e) => setExamCode(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "none",
          }}
        />


        <button
          type="submit"
          style={{
            padding: "10px",
            background: "#38bdf8",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Start Exam
        </button>


      </form>

    </div>
  );
}