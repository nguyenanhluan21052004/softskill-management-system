using System.ComponentModel.DataAnnotations;

namespace Soff_skil.DTOs;

public class CreateStudentRequestDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string ClassCode { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TeacherId { get; set; }
}
