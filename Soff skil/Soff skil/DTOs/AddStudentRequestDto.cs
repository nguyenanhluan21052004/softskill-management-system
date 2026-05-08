using System.ComponentModel.DataAnnotations;

namespace Soff_skil.DTOs;

public class AddStudentRequestDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TeacherId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Password { get; set; } = string.Empty;

    [Range(0, 10)]
    public double Gpa { get; set; }

    [Range(0, 1)]
    public double DeadlineRate { get; set; }

    [Range(0, 10)]
    public double PeerReview { get; set; }

    [Range(0, 10)]
    public double Participation { get; set; }
}
