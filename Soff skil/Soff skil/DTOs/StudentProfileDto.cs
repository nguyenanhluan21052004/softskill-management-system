namespace Soff_skil.DTOs;

public class StudentProfileDto
{
    public int StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string TeacherName { get; set; } = string.Empty;
    public string? ClassCode { get; set; }
    public string? ClassName { get; set; }
    public double Score { get; set; }
    public string Level { get; set; } = string.Empty;
}
