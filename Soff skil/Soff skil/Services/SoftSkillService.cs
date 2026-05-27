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

            var evaluation = await _dbContext.Evaluations
                .FirstOrDefaultAsync(
                    x => x.StudentId == request.StudentId && x.WeekNumber == request.WeekNumber,
                    cancellationToken);

            if (evaluation == null)
            {
                evaluation = new Evaluation
                {
                    StudentId = request.StudentId,
                    EvaluatorId = request.EvaluatorId,
                    EvaluatorType = request.EvaluatorType,
                    WeekNumber = request.WeekNumber,
                    EvaluationDate = DateTime.UtcNow,
                    Comment = request.TeacherComment
                };
                _dbContext.Evaluations.Add(evaluation);
            }
            else
            {
                evaluation.EvaluatorId = request.EvaluatorId;
                evaluation.EvaluatorType = request.EvaluatorType;
                evaluation.EvaluationDate = DateTime.UtcNow;
                evaluation.Comment = request.TeacherComment;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            // --------------------------
            // SAVE STUDENT ACTIVITY
            // --------------------------

            var activity = await _dbContext.StudentActivities
                .FirstOrDefaultAsync(
                    x => x.StudentId == request.StudentId && x.WeekNumber == request.WeekNumber,
                    cancellationToken);

            if (activity == null)
            {
                activity = new StudentActivity
                {
                    StudentId = request.StudentId,
                    WeekNumber = request.WeekNumber
                };
                _dbContext.StudentActivities.Add(activity);
            }

            activity.Attendance = request.Attendance;
            activity.Assignment = request.Assignment;
            activity.Presentation = request.Presentation;
            activity.Project = request.Project;
            activity.PeerReview = request.PeerReview;
            activity.TeamContribution = request.TeamContribution;
            activity.UpdatedAt = DateTime.UtcNow;

            // --------------------------
            // SAVE EVALUATION DETAILS
            // --------------------------

            var detailScores = new[]
            {
                new { SkillType = "Communication", Score = communication, Weight = 0.25 },
                new { SkillType = "Teamwork", Score = teamwork, Weight = 0.30 },
                new { SkillType = "CriticalThinking", Score = criticalThinking, Weight = 0.25 },
                new { SkillType = "TimeManagement", Score = timeManagement, Weight = 0.20 },
            };

            var existingDetails = await _dbContext.EvaluationDetails
                .Where(d => d.EvaluationId == evaluation.EvaluationId)
                .ToListAsync(cancellationToken);

            foreach (var detail in detailScores)
            {
                var match = existingDetails
                    .FirstOrDefault(d => d.SkillType == detail.SkillType);

                if (match == null)
                {
                    _dbContext.EvaluationDetails.Add(new EvaluationDetail
                    {
                        EvaluationId = evaluation.EvaluationId,
                        SkillType = detail.SkillType,
                        Score = detail.Score,
                        Weight = detail.Weight,
                        Comment = string.Empty
                    });
                }
                else
                {
                    match.Score = detail.Score;
                    match.Weight = detail.Weight;
                }
            }

            // --------------------------
            // SAVE PROGRESS TRACKING
            // --------------------------

            var progress = await _dbContext.ProgressTrackings
                .FirstOrDefaultAsync(
                    x => x.StudentId == request.StudentId && x.WeekNumber == request.WeekNumber,
                    cancellationToken);

            if (progress == null)
            {
                progress = new ProgressTracking
                {
                    StudentId = request.StudentId,
                    WeekNumber = request.WeekNumber,
                    TotalScore = finalScore,
                    Rank = rank,
                    AlertFlag = finalScore < 6.5,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.ProgressTrackings.Add(progress);
            }
            else
            {
                progress.TotalScore = finalScore;
                progress.Rank = rank;
                progress.AlertFlag = finalScore < 6.5;
                progress.UpdatedAt = DateTime.UtcNow;
            }

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
                EvaluationId = evaluation.EvaluationId,
                StudentId = request.StudentId,
                EvaluatorId = request.EvaluatorId,
                EvaluatorType = request.EvaluatorType,
                WeekNumber = request.WeekNumber,
                EvaluationDate = evaluation.EvaluationDate,
                TeacherComment = request.TeacherComment,
                Attendance = request.Attendance,
                Assignment = request.Assignment,
                Presentation = request.Presentation,
                Project = request.Project,
                PeerReview = request.PeerReview,
                TeamContribution = request.TeamContribution,
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
        // GET EVALUATION HISTORY
        // =====================================================

        public async Task<IReadOnlyList<CreateEvaluationDto>> GetEvaluationsByStudentAsync(
            int studentId,
            CancellationToken cancellationToken = default)
        {
            var evaluations = await _dbContext.Evaluations
                .AsNoTracking()
                .Include(e => e.Details)
                .Where(e => e.StudentId == studentId)
                .ToListAsync(cancellationToken);

            var activities = await _dbContext.StudentActivities
                .AsNoTracking()
                .Where(a => a.StudentId == studentId)
                .ToListAsync(cancellationToken);

            var progressTrackings = await _dbContext.ProgressTrackings
                .AsNoTracking()
                .Where(p => p.StudentId == studentId)
                .ToListAsync(cancellationToken);

            var evaluationLookup = evaluations
                .GroupBy(e => e.WeekNumber)
                .ToDictionary(g => g.Key, g => g.First());

            var activityLookup = activities
                .GroupBy(a => a.WeekNumber)
                .ToDictionary(g => g.Key, g => g.First());

            var progressLookup = progressTrackings
                .GroupBy(p => p.WeekNumber)
                .ToDictionary(g => g.Key, g => g.First());

            var weeks = evaluations.Select(e => e.WeekNumber)
                .Concat(activities.Select(a => a.WeekNumber))
                .Concat(progressTrackings.Select(p => p.WeekNumber))
                .Distinct()
                .OrderBy(week => week)
                .ToList();

            var results = new List<CreateEvaluationDto>(weeks.Count);

            foreach (var week in weeks)
            {
                evaluationLookup.TryGetValue(week, out var evaluation);
                activityLookup.TryGetValue(week, out var activity);
                progressLookup.TryGetValue(week, out var tracking);

                var communication = activity != null
                    ? SoftSkillCalculator.CalculateCommunication(
                        activity.Presentation,
                        activity.Assignment,
                        activity.PeerReview)
                    : 0;

                var teamwork = activity != null
                    ? SoftSkillCalculator.CalculateTeamwork(
                        activity.PeerReview,
                        activity.TeamContribution,
                        activity.Project)
                    : 0;

                var criticalThinking = activity != null
                    ? SoftSkillCalculator.CalculateCriticalThinking(
                        activity.Assignment,
                        activity.Project)
                    : 0;

                var timeManagement = activity != null
                    ? SoftSkillCalculator.CalculateTimeManagement(
                        activity.Attendance,
                        activity.Assignment)
                    : 0;

                var detailScoreSource = evaluation?.Details ?? Enumerable.Empty<EvaluationDetail>();

                var finalScore = tracking?.TotalScore
                    ?? (activity != null
                        ? SoftSkillCalculator.CalculateFinalScore(
                            communication,
                            teamwork,
                            criticalThinking,
                            timeManagement)
                        : SoftSkillCalculator.CalculateWeightedScore(detailScoreSource));

                var level = tracking?.Rank
                    ?? (finalScore > 0
                        ? SoftSkillCalculator.ClassifyLevel(finalScore)
                        : "Chưa đánh giá");

                var details = evaluation?.Details
                    .OrderBy(d => d.DetailId)
                    .Select(d => new EvaluationDetailDto
                    {
                        SkillType = d.SkillType,
                        Score = d.Score,
                        Weight = d.Weight,
                        Comment = d.Comment
                    })
                    .ToList() ?? [];

                results.Add(new CreateEvaluationDto
                {
                    EvaluationId = evaluation?.EvaluationId,
                    StudentId = studentId,
                    EvaluatorId = evaluation?.EvaluatorId ?? 0,
                    EvaluatorType = evaluation?.EvaluatorType ?? string.Empty,
                    WeekNumber = week,
                    EvaluationDate = evaluation?.EvaluationDate
                        ?? activity?.UpdatedAt
                        ?? DateTime.UtcNow,
                    Comment = evaluation?.Comment ?? string.Empty,
                    Communication = communication,
                    Teamwork = teamwork,
                    CriticalThinking = criticalThinking,
                    TimeManagement = timeManagement,
                    FinalScore = SoftSkillCalculator.NormalizeDashboardScore(finalScore),
                    Level = level,
                    Details = details
                });
            }

            return results;
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
