import ExamEditor from "./components/ExamEditor";
import JudgeDashboard from "./components/JudgeDashboard";

export default function App() {
  const isJudge = window.location.hash === "#judge";

  return isJudge
    ? <JudgeDashboard />
    : <ExamEditor
        candidateName="Alice Smith"
        examId="midterm_2025"
      />;
}