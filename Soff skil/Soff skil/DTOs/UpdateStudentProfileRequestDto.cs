using System.ComponentModel.DataAnnotations;

namespace Soff_skil.DTOs;

public class UpdateStudentProfileRequestDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
}
