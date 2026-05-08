namespace Soff_skil.DTOs;

public class EvaluationDetailDto
{
    public string SkillType { get; set; } = string.Empty;
    public double Score { get; set; }
    public double Weight { get; set; }
    public string Comment { get; set; } = string.Empty;
}
