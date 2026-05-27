using System.ComponentModel.DataAnnotations;

namespace Soff_skil.DTOs;

public class UpdateTeacherProfileRequestDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
