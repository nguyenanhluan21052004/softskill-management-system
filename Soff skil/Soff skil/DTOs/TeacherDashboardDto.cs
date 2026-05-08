namespace Soff_skil.DTOs;

public class TeacherDashboardDto
{
    public int TeacherId { get; set; }

    public string TeacherName { get; set; } = string.Empty;

    // 🔥 thêm dòng này
    public int TotalClasses { get; set; }

    public int TotalStudents { get; set; }

    public double AverageScore { get; set; }

    public int GoodCount { get; set; }

    public int AverageCount { get; set; }

    public int WeakCount { get; set; }

    public IReadOnlyList<TeacherStudentDto> Students { get; set; }
        = new List<TeacherStudentDto>();
}