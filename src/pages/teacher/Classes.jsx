import { toast } from "sonner";
import { Users, BookOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { teacherProfile } from "../../data/mockTeacherData";

export default function Classes() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-semibold">My Classes</h1>
        <p className="text-muted-foreground mt-1">
          {teacherProfile.classes.length} active classes · {teacherProfile.school}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {teacherProfile.classes.map((cls) => {
          const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500"];
          const idx = teacherProfile.classes.indexOf(cls);
          return (
            <Card key={cls.id} className="border-border hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[idx % colors.length]} text-white mb-3`}>
                  <BookOpen className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold leading-tight">{cls.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{cls.grade} Grade</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{cls.students} students</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => toast.info("Gradebook coming soon")}
                  >
                    Open Gradebook
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => toast.info("Roster view coming soon")}
                  >
                    View Roster
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
