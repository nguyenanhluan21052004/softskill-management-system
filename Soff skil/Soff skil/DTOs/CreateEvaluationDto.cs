namespace Soff_skil.DTOs;

public class CreateEvaluationDto
{
    public int? EvaluationId { get; set; }
    public int StudentId { get; set; }
    public int EvaluatorId { get; set; }
    public string EvaluatorType { get; set; } = string.Empty;
    public int WeekNumber { get; set; }
    public DateTime EvaluationDate { get; set; }
    public string Comment { get; set; } = string.Empty;
    public double Communication { get; set; }
    public double Teamwork { get; set; }
    public double CriticalThinking { get; set; }
    public double TimeManagement { get; set; }
    public double FinalScore { get; set; }
    public string Level { get; set; } = string.Empty;
    public IReadOnlyList<EvaluationDetailDto> Details { get; set; } = [];
}
