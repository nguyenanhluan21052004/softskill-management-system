namespace Soff_skil.DTOs;

public class WeeklyTrackingDto
{
    public int WeekNumber { get; set; }
    public double TotalScore { get; set; }
    public int Rank { get; set; }
    public bool AlertFlag { get; set; }
    public DateTime UpdatedAt { get; set; }
}
