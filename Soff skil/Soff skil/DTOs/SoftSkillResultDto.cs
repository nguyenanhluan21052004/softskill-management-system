namespace Soff_skil.DTOs
{
    public class SoftSkillResultDto
    {
        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string ClassCode { get; set; } = string.Empty;

        public double TotalScore { get; set; }

        public string Rank { get; set; } = string.Empty;

        public int WeekNumber { get; set; }
    }
}