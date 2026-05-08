namespace Soff_skil.Models;

public class EvaluationDetail
{
    public int DetailId { get; set; }
    public int EvaluationId { get; set; }
    public string SkillType { get; set; } = string.Empty;
    public double Score { get; set; }
    public double Weight { get; set; }
    public string Comment { get; set; } = string.Empty;

    public Evaluation? Evaluation { get; set; }
}
