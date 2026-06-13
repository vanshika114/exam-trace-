import ExamEditor from "./components/ExamEditor";
import JudgeDashboard from "./components/JudgeDashboard";

export default function App() {
  const isJudge = window.location.pathname === "/judge";
  return isJudge
    ? <JudgeDashboard />
    : <ExamEditor candidateName="Alice Smith" examId="midterm_2025" />;
}