namespace Soff_skil.Models;

public class Teacher
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int? UserId { get; set; }

    public ICollection<Student> Students { get; set; } = new List<Student>();
    public ICollection<Classroom> Classes { get; set; } = new List<Classroom>();
}
