namespace Soff_skil.DTOs;

public class SoftSkillResultsResponseDto
{
    public IReadOnlyList<SoftSkillResultDto> Items { get; set; } = [];
    public int TotalItems { get; set; }
    public int? Page { get; set; }
    public int? PageSize { get; set; }
}
