namespace Soff_skil.Models;

public class Evaluation
{
    public int EvaluationId { get; set; }
    public int StudentId { get; set; }
    public int EvaluatorId { get; set; }
    public string EvaluatorType { get; set; } = string.Empty;
    public int WeekNumber { get; set; }
    public DateTime EvaluationDate { get; set; }
    public string Comment { get; set; } = string.Empty;

    public Student? Student { get; set; }
    public ICollection<EvaluationDetail> Details { get; set; } = new List<EvaluationDetail>();
}
