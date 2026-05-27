using System.ComponentModel.DataAnnotations;

namespace Soff_skil.DTOs;

public class UpdateTeacherPasswordRequestDto
{
    [Required]
    [MaxLength(255)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string NewPassword { get; set; } = string.Empty;
}
