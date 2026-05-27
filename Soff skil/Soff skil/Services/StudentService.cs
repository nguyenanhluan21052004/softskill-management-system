using Microsoft.EntityFrameworkCore;
using Soff_skil.Data;
using Soff_skil.DTOs;

namespace Soff_skil.Services;

public class StudentService : IStudentService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<StudentService> _logger;

    public StudentService(ApplicationDbContext dbContext, ILogger<StudentService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<StudentProfileDto?> GetStudentProfileAsync(int studentId, CancellationToken cancellationToken = default)
    {
        dynamic? profile;
        try
        {
            profile = await (from student in _dbContext.Students.AsNoTracking()
                where student.UserId == studentId
                join classroom in _dbContext.Classes.AsNoTracking()
                    on student.ClassCode equals classroom.Code into classes
                from classroom in classes.DefaultIfEmpty()
                join teacher in _dbContext.Teachers.AsNoTracking()
                    on classroom != null ? classroom.TeacherId : 0 equals teacher.Id into teachers
                from teacher in teachers.DefaultIfEmpty()
                select new
                {
                    student.Id,
                    student.Name,
                    student.ClassCode,
                    ClassName = classroom != null ? classroom.Name : null,
                    TeacherName = teacher != null ? teacher.Name : string.Empty,
                    LatestScore = student.ProgressTrackings
                        .OrderByDescending(p => p.WeekNumber)
                        .Select(p => (double?)p.TotalScore)
                        .FirstOrDefault()
                }).SingleOrDefaultAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read progress tracking for student userId {UserId}. Falling back to score=0.", studentId);
            profile = await (from student in _dbContext.Students.AsNoTracking()
                where student.UserId == studentId
                join classroom in _dbContext.Classes.AsNoTracking()
                    on student.ClassCode equals classroom.Code into classes
                from classroom in classes.DefaultIfEmpty()
                join teacher in _dbContext.Teachers.AsNoTracking()
                    on classroom != null ? classroom.TeacherId : 0 equals teacher.Id into teachers
                from teacher in teachers.DefaultIfEmpty()
                select new
                {
                    student.Id,
                    student.Name,
                    student.ClassCode,
                    ClassName = classroom != null ? classroom.Name : null,
                    TeacherName = teacher != null ? teacher.Name : string.Empty,
                    LatestScore = (double?)0
                }).SingleOrDefaultAsync(cancellationToken);
        }

        if (profile == null)
        {
            return null;
        }

        var score = profile.LatestScore ?? 0;

        return new StudentProfileDto
        {
            StudentId = profile.Id,
            StudentName = profile.Name,
            TeacherName = profile.TeacherName,
            ClassCode = profile.ClassCode,
            ClassName = profile.ClassName,
            Score = SoftSkillCalculator.NormalizeDashboardScore(score),
            Level = SoftSkillCalculator.ClassifyLevel(score)
        };
    }

    public async Task<StudentProfileDto?> UpdateProfileByUserIdAsync(
        int userId,
        UpdateStudentProfileRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var student = await _dbContext.Students
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        if (student == null)
        {
            return null;
        }

        student.Name = request.Name.Trim();
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetStudentProfileAsync(userId, cancellationToken);
    }

    public async Task UpdatePasswordByUserIdAsync(
        int userId,
        UpdateStudentPasswordRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (!PasswordHasher.VerifyPassword(request.CurrentPassword, user.Password))
        {
            throw new InvalidOperationException("Current password is incorrect.");
        }

        user.Password = PasswordHasher.HashPassword(request.NewPassword);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
