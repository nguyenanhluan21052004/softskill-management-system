namespace Soff_skil.DTOs;

public class EvaluationCreateRequestDto
{
    public int StudentId { get; set; }
    public int EvaluatorId { get; set; }
    public string EvaluatorType { get; set; } = string.Empty;
    public int WeekNumber { get; set; }
    public DateTime EvaluationDate { get; set; }
    public double Attendance { get; set; }
    public double Assignment { get; set; }
    public double Presentation { get; set; }
    public double Project { get; set; }
    public double PeerReview { get; set; }
    public double TeamContribution { get; set; }
    public string TeacherComment { get; set; } = string.Empty;
}
