namespace Soff_skil.DTOs;

public class EvaluationCreateResponseDto
{
    public int EvaluationId { get; set; }
    public int StudentId { get; set; }
    public int EvaluatorId { get; set; }
    public string EvaluatorType { get; set; } = string.Empty;
    public int WeekNumber { get; set; }
    public DateTime EvaluationDate { get; set; }
    public string TeacherComment { get; set; } = string.Empty;
    public double Attendance { get; set; }
    public double Assignment { get; set; }
    public double Presentation { get; set; }
    public double Project { get; set; }
    public double PeerReview { get; set; }
    public double TeamContribution { get; set; }
    public double Communication { get; set; }
    public double Teamwork { get; set; }
    public double CriticalThinking { get; set; }
    public double TimeManagement { get; set; }
    public double FinalScore { get; set; }
    public string Level { get; set; } = string.Empty;
    public IReadOnlyList<RecommendationDto> Recommendations { get; set; } = [];
}
