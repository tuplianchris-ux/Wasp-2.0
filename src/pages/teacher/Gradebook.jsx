import { useMemo } from "react";
import { mockStudents, mockAssignments } from "../../data/mockTeacherData";

const GRADE_OPTIONS = ["A", "A", "A", "B", "B", "B", "C", "C", "D", null];

function seededGrade(studentId, assignmentId) {
  // Deterministic pseudo-random grade based on student+assignment IDs
  const seed = (studentId + assignmentId).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const options = ["A", "A", "B", "B", "B", "C", "C", "D", null, null];
  return options[seed % options.length];
}

const GRADE_CELL = {
  A: "bg-green-500/15 text-green-700 font-semibold",
  B: "bg-blue-500/15 text-blue-700 font-semibold",
  C: "bg-amber-500/15 text-amber-700 font-semibold",
  D: "bg-red-500/15 text-red-600 font-semibold",
  F: "bg-red-600/15 text-red-700 font-bold",
  null: "text-muted-foreground",
};

const displayStudents = mockStudents.slice(0, 8);
const displayAssignments = mockAssignments.filter((a) => a.status !== "draft").slice(0, 4);

export default function Gradebook() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Gradebook</h1>
        <p className="text-muted-foreground mt-1">
          Showing {displayStudents.length} students · {displayAssignments.length} assignments
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground min-w-[160px] sticky left-0 bg-muted/40 z-10">
                Student
              </th>
              {displayAssignments.map((a) => (
                <th
                  key={a.id}
                  className="text-center px-3 py-3 text-xs font-medium text-muted-foreground min-w-[120px]"
                >
                  <div className="truncate max-w-[110px] mx-auto" title={a.title}>{a.title}</div>
                  <div className="text-[10px] text-muted-foreground/60 font-normal capitalize">{a.type}</div>
                </th>
              ))}
              <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground min-w-[60px]">
                Avg
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayStudents.map((s) => {
              const grades = displayAssignments.map((a) => seededGrade(s.id, a.id));
              const gradeScores = { A: 95, B: 85, C: 75, D: 65, null: null };
              const scored = grades.filter((g) => g !== null).map((g) => gradeScores[g]);
              const avg = scored.length
                ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
                : null;
              const avgLetter = avg
                ? avg >= 90 ? "A" : avg >= 80 ? "B" : avg >= 70 ? "C" : avg >= 60 ? "D" : "F"
                : "—";

              const initials = s.name.split(" ").map((n) => n[0]).join("");

              return (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 sticky left-0 bg-background z-10 border-r border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-xs leading-tight">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">{s.grade} Grade</p>
                      </div>
                    </div>
                  </td>
                  {grades.map((grade, i) => (
                    <td key={i} className="text-center px-3 py-3">
                      <span
                        className={`inline-flex h-7 w-10 items-center justify-center rounded-md text-xs ${
                          GRADE_CELL[grade] ?? GRADE_CELL[null]
                        }`}
                      >
                        {grade ?? "—"}
                      </span>
                    </td>
                  ))}
                  <td className="text-center px-3 py-3">
                    <span className={`font-bold text-sm ${GRADE_CELL[avgLetter !== "—" ? avgLetter : null]}`}>
                      {avgLetter}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        — indicates assignment not submitted. Showing first {displayStudents.length} students and {displayAssignments.length} graded assignments.
      </p>
    </div>
  );
}
