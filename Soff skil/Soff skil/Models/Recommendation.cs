namespace Soff_skil.Models;

public class Recommendation
{
    public int RecommendationId { get; set; }
    public int StudentId { get; set; }
    public string SkillType { get; set; } = string.Empty;
    public string Suggestion { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Student? Student { get; set; }
}
