using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Soff_skil.Models
{
    [Table("progress_tracking")]
    public class ProgressTracking
    {
        [Key]
        public int ProgressId { get; set; }

        public int StudentId { get; set; }

        public int WeekNumber { get; set; }

        public double TotalScore { get; set; }

        // QUAN TRỌNG NHẤT
        public string Rank { get; set; } = string.Empty;

        public bool AlertFlag { get; set; }

        public DateTime UpdatedAt { get; set; }

        [ForeignKey("StudentId")]
        public Student Student { get; set; }
    }
}