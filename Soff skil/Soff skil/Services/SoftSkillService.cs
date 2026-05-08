using Microsoft.EntityFrameworkCore;
using Soff_skil.Data;
using Soff_skil.DTOs;
using Soff_skil.Models;

namespace Soff_skil.Services
{
    public class SoftSkillService : ISoftSkillService
    {
        private readonly ApplicationDbContext _dbContext;

        public SoftSkillService(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        // =====================================================
        // GET ALL RESULTS
        // =====================================================

        public async Task<IReadOnlyList<SoftSkillResultDto>> GetResultsAsync(
            CancellationToken cancellationToken = default)
        {
            var results = await (
                from s in _dbContext.Students

                join p in _dbContext.ProgressTrackings
                    on s.Id equals p.StudentId into progressGroup

                from p in progressGroup.DefaultIfEmpty()

                select new SoftSkillResultDto
                {
                    StudentId = s.Id,
                    StudentName = s.Name,
                    ClassCode = s.ClassCode,

                    TotalScore = p != null
        ? p.TotalScore
        : 0,

                    Rank = p != null
        ? p.Rank
        : "Chưa đánh giá",

                    WeekNumber = p != null
        ? p.WeekNumber
        : 0
                }
            )
            .OrderByDescending(x => x.TotalScore)
            .ThenBy(x => x.StudentName)
            .ToListAsync(cancellationToken);

            return results;
        }

        // =====================================================
        // GET TOP RESULTS
        // =====================================================

        public async Task<IReadOnlyList<SoftSkillResultDto>> GetTopResultsAsync(
            int limit,
            CancellationToken cancellationToken = default)
        {
            var normalizedLimit = limit <= 0 ? 5 : limit;

            var results = await GetResultsAsync(cancellationToken);

            return results
                .OrderByDescending(x => x.TotalScore)
                .Take(normalizedLimit)
                .ToList();
        }

        // =====================================================
        // GET STATISTICS
        // =====================================================

        public async Task<SoftSkillStatisticsDto> GetStatisticsAsync(
            CancellationToken cancellationToken = default)
        {
            var results = await GetResultsAsync(cancellationToken);

            if (results.Count == 0)
            {
                return new SoftSkillStatisticsDto();
            }

            return new SoftSkillStatisticsDto
            {
                TotalStudents = results.Count,

                AverageScore = Math.Round(
                    results.Average(x => (double)x.TotalScore),
                    2),

                Good = results.Count(x => x.Rank == "Tốt"),

                Average = results.Count(x => x.Rank == "Trung bình"),

                Weak = results.Count(x => x.Rank == "Yếu")
            };
        }

        // =====================================================
        // CREATE EVALUATION
        // =====================================================

        public async Task<EvaluationCreateResponseDto> CreateEvaluationAsync(
            EvaluationCreateRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var student = await _dbContext.Students
                .FirstOrDefaultAsync(
                    x => x.Id == request.StudentId,
                    cancellationToken);

            if (student == null)
            {
                throw new Exception("Student not found.");
            }

            // --------------------------
            // CALCULATE SOFT SKILL SCORE
            // --------------------------

            var communication =
                request.Presentation * 0.4 +
                request.Assignment * 0.3 +
                request.PeerReview * 0.3;

            var teamwork =
                request.PeerReview * 0.5 +
                request.TeamContribution * 0.3 +
                request.Project * 0.2;

            var criticalThinking =
                (request.Assignment + request.Project) / 2;

            var timeManagement =
                (request.Attendance + request.Assignment) / 2;

            var finalScore =
                communication * 0.25 +
                teamwork * 0.30 +
                criticalThinking * 0.25 +
                timeManagement * 0.20;

            var rank = ClassifyLevel(finalScore);

            // --------------------------
            // SAVE EVALUATION
            // --------------------------

            var evaluation = new Evaluation
            {
                StudentId = request.StudentId,
                EvaluatorId = request.EvaluatorId,
                EvaluatorType = request.EvaluatorType,
                WeekNumber = request.WeekNumber,
                EvaluationDate = DateTime.UtcNow,
                Comment = request.TeacherComment
            };

            _dbContext.Evaluations.Add(evaluation);
            await _dbContext.SaveChangesAsync(cancellationToken);

            // --------------------------
            // SAVE PROGRESS TRACKING
            // --------------------------

            var progress = new ProgressTracking
            {
                StudentId = request.StudentId,
                WeekNumber = request.WeekNumber,
                TotalScore = finalScore,
                Rank = rank,
                AlertFlag = finalScore < 6.5,
                UpdatedAt = DateTime.UtcNow
            };

            _dbContext.ProgressTrackings.Add(progress);

            // --------------------------
            // SAVE RECOMMENDATION
            // --------------------------

            if (communication < 5)
            {
                _dbContext.Recommendations.Add(new Recommendation
                {
                    StudentId = request.StudentId,
                    SkillType = "Communication",
                    Suggestion = "Cần tăng kỹ năng thuyết trình nhóm",
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (teamwork < 5)
            {
                _dbContext.Recommendations.Add(new Recommendation
                {
                    StudentId = request.StudentId,
                    SkillType = "Teamwork",
                    Suggestion = "Cần cải thiện kỹ năng làm việc nhóm",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new EvaluationCreateResponseDto
            {
                StudentId = request.StudentId,
                FinalScore = finalScore,
                Level = rank,
                Communication = communication,
                Teamwork = teamwork,
                CriticalThinking = criticalThinking,
                TimeManagement = timeManagement
            };
        }

        // =====================================================
        // GET STUDENT PROGRESS
        // =====================================================

        public async Task<StudentProgressDto?> GetStudentProgressAsync(
            int studentId,
            CancellationToken cancellationToken = default)
        {
            var student = await _dbContext.Students
                .FirstOrDefaultAsync(
                    x => x.Id == studentId,
                    cancellationToken);

            if (student == null)
            {
                return null;
            }

            var latestProgress = await _dbContext.ProgressTrackings
                .Where(x => x.StudentId == studentId)
                .OrderByDescending(x => x.WeekNumber)
                .FirstOrDefaultAsync(cancellationToken);

            if (latestProgress == null)
            {
                return null;
            }

            return new StudentProgressDto
            {
                StudentId = student.Id,
                StudentName = student.Name,
                CurrentScore = latestProgress.TotalScore,
                Level = latestProgress.Rank,
                LatestWeek = latestProgress.WeekNumber,
                AlertFlag = latestProgress.AlertFlag
            };
        }

        // =====================================================
        // GET RECOMMENDATIONS
        // =====================================================

        public async Task<IReadOnlyList<RecommendationDto>> GetRecommendationsAsync(
            int studentId,
            CancellationToken cancellationToken = default)
        {
            return await _dbContext.Recommendations
                .Where(x => x.StudentId == studentId)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new RecommendationDto
                {
                    RecommendationId = x.RecommendationId,
                    StudentId = x.StudentId,
                    SkillType = x.SkillType,
                    Suggestion = x.Suggestion,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }

        // =====================================================
        // CLASSIFY LEVEL
        // =====================================================

        private string ClassifyLevel(double score)
        {
            if (score >= 8)
                return "Tốt";

            if (score >= 6.5)
                return "Trung bình";

            return "Yếu";
        }
    }
}