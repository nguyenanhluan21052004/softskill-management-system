namespace Soff_skil.DTOs;

public class RecommendationDto
{
    public int RecommendationId { get; set; }
    public int StudentId { get; set; }
    public string SkillType { get; set; } = string.Empty;
    public string Suggestion { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
