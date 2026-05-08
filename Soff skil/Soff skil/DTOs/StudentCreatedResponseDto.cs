namespace Soff_skil.DTOs;

public class StudentCreatedResponseDto
{
    public int StudentId { get; set; }
    public int UserId { get; set; }
    public int TeacherId { get; set; }
    public string Name { get; set; } = string.Empty;
}
