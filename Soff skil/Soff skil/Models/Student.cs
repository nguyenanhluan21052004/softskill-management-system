using System.ComponentModel.DataAnnotations.Schema;

namespace Soff_skil.Models;

public class Student
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
   
    public string ClassCode { get; set; } = string.Empty;

    public int TeacherId { get; set; }
    public int UserId { get; set; }

    public Teacher? Teacher { get; set; }
    public User? User { get; set; }
    public Classroom? Classroom { get; set; }

    public ICollection<Evaluation> Evaluations { get; set; } = new List<Evaluation>();
    public ICollection<StudentActivity> Activities { get; set; } = new List<StudentActivity>();
    public ICollection<ProgressTracking> ProgressTrackings { get; set; } = new List<ProgressTracking>();
    public ICollection<Recommendation> Recommendations { get; set; } = new List<Recommendation>();
}
