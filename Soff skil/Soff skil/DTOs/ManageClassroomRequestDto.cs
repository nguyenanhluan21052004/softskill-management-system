using System.ComponentModel.DataAnnotations;

namespace Soff_skil.DTOs;

public class ManageClassroomRequestDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TeacherId { get; set; }
}
