namespace Soff_skil.Models;

public class StudentActivity
{
    public int ActivityId { get; set; }
    public int StudentId { get; set; }
    public int WeekNumber { get; set; }
    public double Attendance { get; set; }
    public double Assignment { get; set; }
    public double Presentation { get; set; }
    public double Project { get; set; }
    public double PeerReview { get; set; }
    public double TeamContribution { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Student? Student { get; set; }
}
