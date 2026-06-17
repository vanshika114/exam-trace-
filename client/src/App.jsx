import { useState } from "react";
import ExamEditor from "./components/ExamEditor";
import JudgeDashboard from "./components/JudgeDashboard";
import MobileMonitor from "./components/MobileMonitor";
import StartExam from "./components/StartExam";

export default function App() {

  const [started, setStarted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [examCode, setExamCode] = useState("");

  const hash = window.location.hash;

  const params = new URLSearchParams(
    hash.includes("?") ? hash.split("?")[1] : ""
  );


  if (hash.startsWith("#judge")) {
    return <JudgeDashboard />;
  }


  if (hash.startsWith("#monitor")) {
    return (
      <MobileMonitor
        sessionId={params.get("sessionId") || ""}
        studentName={params.get("studentName") || ""}
        examCode={params.get("examCode") || ""}
      />
    );
  }


  if (!started) {
    return (
      <StartExam
        onStart={(name, code) => {
          setStudentName(name);
          setExamCode(code);
          setStarted(true);
        }}
      />
    );
  }


  return (
    <ExamEditor
      candidateName={studentName}
      examId={examCode}
    />
  );
}