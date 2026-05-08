namespace Soff_skil.DTOs;

public class AdminAccountOptionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? ClassCode { get; set; }
    public string? ClassName { get; set; }
    public string? TeacherName { get; set; }
    public double Score { get; set; }
    public string? Level { get; set; }
}
