namespace Soff_skil.DTOs;

public class TeacherProfileDto
{
    public int TeacherId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Username { get; set; }
}
