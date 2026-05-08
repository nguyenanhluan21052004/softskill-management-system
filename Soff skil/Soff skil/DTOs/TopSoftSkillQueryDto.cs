using System.ComponentModel.DataAnnotations;

namespace Soff_skil.DTOs;

public class TopSoftSkillQueryDto
{
    [Range(1, 100)]
    public int Limit { get; set; } = 5;
}
