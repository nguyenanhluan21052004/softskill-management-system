using Microsoft.EntityFrameworkCore;
using Soff_skil.Data;
using Soff_skil.DTOs;
using Soff_skil.Models;

namespace Soff_skil.Services;

public class TeacherService : ITeacherService
{
    private sealed class StudentScoreProjection
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string ClassCode { get; set; } = string.Empty;

        public double? LatestScore { get; set; }
    }

    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<TeacherService> _logger;

    public TeacherService(ApplicationDbContext dbContext, ILogger<TeacherService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    // ================= DASHBOARD THEO TEACHER ID =================
    public async Task<TeacherDashboardDto?> GetDashboardAsync(
     int teacherId,
     CancellationToken cancellationToken = default)
    {
        var teacher = await _dbContext.Teachers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == teacherId, cancellationToken);

        if (teacher == null)
            return null;

        // Lấy tất cả lớp của giáo viên
        var classes = await _dbContext.Classes
            .AsNoTracking()
            .Where(c => c.TeacherId == teacherId)
            .ToListAsync(cancellationToken);

        if (!classes.Any())
        {
            return new TeacherDashboardDto
            {
                TeacherId = teacher.Id,
                TeacherName = teacher.Name,
                TotalClasses = 0,
                TotalStudents = 0,
                AverageScore = 0,
                GoodCount = 0,
                AverageCount = 0,
                WeakCount = 0,
                Students = []
            };
        }

        var classCodes = classes
            .Select(c => c.Code)
            .ToList();

        List<StudentScoreProjection> students;

        try
        {
            students = await _dbContext.Students
                .AsNoTracking()
                .Where(x => classCodes.Contains(x.ClassCode))
                .Select(x => new StudentScoreProjection
                {
                    Id = x.Id,
                    Name = x.Name,
                    ClassCode = x.ClassCode,
                    LatestScore = x.ProgressTrackings
                        .OrderByDescending(p => p.WeekNumber)
                        .Select(p => (double?)p.TotalScore)
                        .FirstOrDefault()
                })
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to read progress tracking for teacher {TeacherId}",
                teacherId);

            students = await _dbContext.Students
                .AsNoTracking()
                .Where(x => classCodes.Contains(x.ClassCode))
                .Select(x => new StudentScoreProjection
                {
                    Id = x.Id,
                    Name = x.Name,
                    ClassCode = x.ClassCode,
                    LatestScore = 0
                })
                .ToListAsync(cancellationToken);
        }

        var studentDtos = students
            .Select(x =>
            {
                var score = x.LatestScore ?? 0;

                return new TeacherStudentDto
                {
                    StudentId = x.Id,
                    StudentName = x.Name,
                    ClassCode = x.ClassCode ?? string.Empty,
                    Score = SoftSkillCalculator.NormalizeDashboardScore(score),
                    Level = SoftSkillCalculator.ClassifyLevel(score)
                };
            })
            .OrderBy(x => x.StudentName)
            .ToList();

        return new TeacherDashboardDto
        {
            TeacherId = teacher.Id,
            TeacherName = teacher.Name,

            // Tổng số lớp giáo viên phụ trách
            TotalClasses = classes.Count,

            // Tổng số sinh viên
            TotalStudents = studentDtos.Count,

            // Điểm trung bình
            AverageScore = studentDtos.Count > 0
                ? Math.Round(studentDtos.Average(x => x.Score), 2)
                : 0,

            // Phân loại sinh viên
            GoodCount = studentDtos.Count(x =>
                x.Level == SoftSkillCalculator.LevelGood),

            AverageCount = studentDtos.Count(x =>
                x.Level == SoftSkillCalculator.LevelAverage),

            WeakCount = studentDtos.Count(x =>
                x.Level == SoftSkillCalculator.LevelWeak),

            Students = studentDtos
        };
    }
    // ================= DASHBOARD THEO USER ID (JWT) =================
    public async Task<TeacherDashboardDto?> GetDashboardByUserIdAsync(int userId, CancellationToken cancellationToken = default)
    {
        var teacher = await _dbContext.Teachers
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.UserId == userId, cancellationToken);

        if (teacher == null)
        {
            // Backward compatibility for old databases without teacher.user_id mapping.
            teacher = await _dbContext.Teachers
                .AsNoTracking()
                .OrderBy(t => t.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (teacher == null)
        {
            return null;
        }

        return await GetDashboardAsync(teacher.Id, cancellationToken);
    }
}
