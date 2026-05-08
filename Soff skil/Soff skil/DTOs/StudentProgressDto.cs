namespace Soff_skil.DTOs
{
    public class StudentProgressDto
    {
        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public double CurrentScore { get; set; }

        public string Level { get; set; } = string.Empty;

        public int LatestWeek { get; set; }

        public bool AlertFlag { get; set; }
    }
}