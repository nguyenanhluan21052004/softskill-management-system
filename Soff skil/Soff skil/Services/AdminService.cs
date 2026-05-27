using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using Soff_skil.Data;
using Soff_skil.DTOs;
using Soff_skil.Models;
using System.Text;
using System.Globalization;

namespace Soff_skil.Services;

public class AdminService : IAdminService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ISoftSkillService _softSkillService;

    public AdminService(ApplicationDbContext dbContext, ISoftSkillService softSkillService)
    {
        _dbContext = dbContext;
        _softSkillService = softSkillService;
    }

    public async Task<ImportExcelResponseDto> ImportExcelAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);
        stream.Position = 0;

        using var package = new ExcelPackage(stream);
        var worksheet = package.Workbook.Worksheets.FirstOrDefault();

        if (worksheet == null || worksheet.Dimension == null)
        {
            return new ImportExcelResponseDto
            {
                ImportedCount = 0,
                SkippedCount = 1,
                Errors = new List<string> { "Excel empty" }
            };
        }

        int imported = 0;
        int skipped = 0;
        var errors = new List<string>();

        for (int row = 2; row <= worksheet.Dimension.End.Row; row++)
        {
            try
            {
                var studentCode = worksheet.Cells[row, 1].Text?.Trim();
                var studentName = worksheet.Cells[row, 2].Text?.Trim();
                var classCode = worksheet.Cells[row, 3].Text?.Trim();
                var teacherName = worksheet.Cells[row, 4].Text?.Trim();

                if (string.IsNullOrWhiteSpace(studentCode) ||
                    string.IsNullOrWhiteSpace(studentName) ||
                    string.IsNullOrWhiteSpace(classCode) ||
                    string.IsNullOrWhiteSpace(teacherName))
                {
                    skipped++;
                    errors.Add($"Row {row}: Missing data");
                    continue;
                }

                var teacher = await GetOrCreateTeacherAsync(teacherName, cancellationToken);
                var classroom = await _dbContext.Classes
                    .Include(c => c.Teacher)
                    .SingleOrDefaultAsync(c => c.Code == classCode, cancellationToken);

                if (classroom == null)
                {
                    classroom = new Classroom
                    {
                        Name = classCode,
                        Code = classCode,
                        TeacherId = teacher.Id
                    };
                    _dbContext.Classes.Add(classroom);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
                else if (classroom.TeacherId != teacher.Id)
                {
                    classroom.TeacherId = teacher.Id;
                    await _dbContext.SaveChangesAsync(cancellationToken);
                    errors.Add($"Row {row}: Class {classCode} reassigned to {teacher.Name}.");
                }

                var attendance = ParseScore(row, 5, worksheet);
                var assignment = ParseScore(row, 6, worksheet);
                var presentation = ParseScore(row, 7, worksheet);
                var project = ParseScore(row, 8, worksheet);
                var peerReview = ParseScore(row, 9, worksheet);

                if (attendance == null || assignment == null || presentation == null || project == null || peerReview == null)
                {
                    skipped++;
                    errors.Add($"Row {row}: One or more scores are invalid.");
                    continue;
                }

                var user = await _dbContext.Users.SingleOrDefaultAsync(x => x.Username == studentCode, cancellationToken);
                if (user == null)
                {
                    user = new User
                    {
                        Username = studentCode,
                        Password = PasswordHasher.HashPassword(studentCode),
                        Role = "student"
                    };
                    _dbContext.Users.Add(user);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }

                var student = await _dbContext.Students.SingleOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);
                if (student == null)
                {
                    student = new Student();
                    _dbContext.Students.Add(student);
                }

                student.Name = studentName;
                student.UserId = user.Id;
                student.ClassCode = classCode;
                student.TeacherId = classroom.TeacherId;
                await _dbContext.SaveChangesAsync(cancellationToken);

                var evaluationRequest = new EvaluationCreateRequestDto
                {
                    StudentId = student.Id,
                    EvaluatorId = classroom.TeacherId,
                    EvaluatorType = "system",
                    WeekNumber = ISOWeek.GetWeekOfYear(DateTime.UtcNow),
                    EvaluationDate = DateTime.UtcNow,
                    TeacherComment = "Imported from Excel",
                    Attendance = attendance.Value,
                    Assignment = assignment.Value,
                    Presentation = presentation.Value,
                    Project = project.Value,
                    PeerReview = peerReview.Value,
                    TeamContribution = peerReview.Value
                };

                await _softSkillService.CreateEvaluationAsync(evaluationRequest, cancellationToken);

                imported++;
            }
            catch (Exception ex)
            {
                skipped++;
                errors.Add($"Row {row}: {ex.InnerException?.Message ?? ex.Message}");
            }
        }

        return new ImportExcelResponseDto
        {
            ImportedCount = imported,
            SkippedCount = skipped,
            Errors = errors
        };
    }

    public async Task<ClassroomSummaryDto> CreateClassroomAsync(ManageClassroomRequestDto request, CancellationToken cancellationToken = default)
    {
        var code = request.Code.Trim();
        var name = request.Name.Trim();
        var teacher = await _dbContext.Teachers.SingleOrDefaultAsync(t => t.Id == request.TeacherId, cancellationToken)
            ?? throw new InvalidOperationException($"Teacher {request.TeacherId} was not found.");

        var exists = await _dbContext.Classes.AnyAsync(c => c.Code == code, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException($"Class {code} already exists.");
        }

        var classroom = new Classroom
        {
            Name = name,
            Code = code,
            TeacherId = teacher.Id
        };

        _dbContext.Classes.Add(classroom);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await MapClassroomAsync(classroom.Id, cancellationToken);
    }

    public async Task<ClassroomSummaryDto> UpdateClassroomAsync(int classId, ManageClassroomRequestDto request, CancellationToken cancellationToken = default)
    {
        var classroom = await _dbContext.Classes.SingleOrDefaultAsync(c => c.Id == classId, cancellationToken)
            ?? throw new InvalidOperationException($"Classroom {classId} was not found.");

        var teacher = await _dbContext.Teachers.SingleOrDefaultAsync(t => t.Id == request.TeacherId, cancellationToken)
            ?? throw new InvalidOperationException($"Teacher {request.TeacherId} was not found.");

        var previousCode = classroom.Code;
        var updatedCode = request.Code.Trim();

        classroom.Name = request.Name.Trim();
        classroom.Code = updatedCode;
        classroom.TeacherId = teacher.Id;

        var enrolledStudents = await _dbContext.Students
            .Where(s => s.ClassCode == previousCode)
            .ToListAsync(cancellationToken);

        foreach (var student in enrolledStudents)
        {
            student.ClassCode = updatedCode;
            student.TeacherId = teacher.Id;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await MapClassroomAsync(classroom.Id, cancellationToken);
    }

    public async Task<ClassroomSummaryDto> ReassignTeacherAsync(int classId, ReassignClassroomTeacherRequestDto request, CancellationToken cancellationToken = default)
    {
        var classroom = await _dbContext.Classes.SingleOrDefaultAsync(c => c.Id == classId, cancellationToken)
            ?? throw new InvalidOperationException($"Classroom {classId} was not found.");

        var teacher = await _dbContext.Teachers.SingleOrDefaultAsync(t => t.Id == request.TeacherId, cancellationToken)
            ?? throw new InvalidOperationException($"Teacher {request.TeacherId} was not found.");

        classroom.TeacherId = teacher.Id;

        var enrolledStudents = await _dbContext.Students
            .Where(s => s.ClassCode == classroom.Code)
            .ToListAsync(cancellationToken);

        foreach (var student in enrolledStudents)
        {
            student.TeacherId = teacher.Id;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await MapClassroomAsync(classId, cancellationToken);
    }

    public async Task<IReadOnlyList<ClassroomSummaryDto>> GetClassroomsAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Classes
            .AsNoTracking()
            .Include(c => c.Teacher)
            .Select(c => new ClassroomSummaryDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                TeacherId = c.TeacherId,
                TeacherName = c.Teacher != null ? c.Teacher.Name : string.Empty,
                StudentCount = c.Students.Count
            })
            .OrderBy(c => c.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task<BackfillEvaluationResponseDto> BackfillEvaluationDetailsAsync(
        bool overwrite = false,
        CancellationToken cancellationToken = default)
    {
        var progressRows = await _dbContext.ProgressTrackings
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var updated = 0;
        var createdEvaluations = 0;
        var skipped = 0;

        foreach (var tracking in progressRows)
        {
            var evaluation = await _dbContext.Evaluations
                .Include(e => e.Details)
                .FirstOrDefaultAsync(
                    e => e.StudentId == tracking.StudentId && e.WeekNumber == tracking.WeekNumber,
                    cancellationToken);

            if (evaluation == null)
            {
                evaluation = new Evaluation
                {
                    StudentId = tracking.StudentId,
                    EvaluatorId = 0,
                    EvaluatorType = "system",
                    WeekNumber = tracking.WeekNumber,
                    EvaluationDate = tracking.UpdatedAt == default ? DateTime.UtcNow : tracking.UpdatedAt,
                    Comment = "Auto-generated from total score"
                };
                _dbContext.Evaluations.Add(evaluation);
                await _dbContext.SaveChangesAsync(cancellationToken);
                createdEvaluations++;
            }

            var activity = await _dbContext.StudentActivities
                .FirstOrDefaultAsync(
                    a => a.StudentId == tracking.StudentId && a.WeekNumber == tracking.WeekNumber,
                    cancellationToken);

            var hasDetails = evaluation.Details != null && evaluation.Details.Any();
            var hasActivity = activity != null;

            if (!overwrite && hasDetails && hasActivity)
            {
                skipped++;
                continue;
            }

            var totalScore = Math.Clamp(tracking.TotalScore, 0, 10);
            const double avgWeight = 0.25;

            var rawScores = new[]
            {
                new { SkillType = "Communication", Weight = 0.25, Score = totalScore * (0.25 / avgWeight) },
                new { SkillType = "Teamwork", Weight = 0.30, Score = totalScore * (0.30 / avgWeight) },
                new { SkillType = "CriticalThinking", Weight = 0.25, Score = totalScore * (0.25 / avgWeight) },
                new { SkillType = "TimeManagement", Weight = 0.20, Score = totalScore * (0.20 / avgWeight) },
            };

            var weightedSum = rawScores.Sum(item => item.Score * item.Weight);
            var scale = weightedSum > 0 ? totalScore / weightedSum : 1;

            var communication = Math.Clamp(rawScores[0].Score * scale, 0, 10);
            var teamwork = Math.Clamp(rawScores[1].Score * scale, 0, 10);
            var criticalThinking = Math.Clamp(rawScores[2].Score * scale, 0, 10);
            var timeManagement = Math.Clamp(rawScores[3].Score * scale, 0, 10);

            if (activity == null)
            {
                activity = new StudentActivity
                {
                    StudentId = tracking.StudentId,
                    WeekNumber = tracking.WeekNumber
                };
                _dbContext.StudentActivities.Add(activity);
            }

            var assignment = (0.4 * criticalThinking - 0.7 * teamwork + communication) / 0.45;
            assignment = Math.Clamp(assignment, 0, 10);
            var peerReview = Math.Clamp(2 * communication - assignment, 0, 10);
            var project = Math.Clamp(2 * criticalThinking - assignment, 0, 10);
            var attendance = Math.Clamp(2 * timeManagement - assignment, 0, 10);
            var presentation = Math.Clamp(communication, 0, 10);
            var teamContribution = Math.Clamp(teamwork, 0, 10);

            activity.Attendance = attendance;
            activity.Assignment = assignment;
            activity.Presentation = presentation;
            activity.Project = project;
            activity.PeerReview = peerReview;
            activity.TeamContribution = teamContribution;
            activity.UpdatedAt = tracking.UpdatedAt == default ? DateTime.UtcNow : tracking.UpdatedAt;

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
                var match = existingDetails.FirstOrDefault(d => d.SkillType == detail.SkillType);
                if (match == null)
                {
                    _dbContext.EvaluationDetails.Add(new EvaluationDetail
                    {
                        EvaluationId = evaluation.EvaluationId,
                        SkillType = detail.SkillType,
                        Score = detail.Score,
                        Weight = detail.Weight,
                        Comment = "Auto-generated from weighted backfill"
                    });
                }
                else
                {
                    match.Score = detail.Score;
                    match.Weight = detail.Weight;
                    match.Comment = "Auto-generated from weighted backfill";
                }
            }

            updated++;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new BackfillEvaluationResponseDto
        {
            UpdatedCount = updated,
            CreatedEvaluations = createdEvaluations,
            SkippedCount = skipped
        };
    }

    public async Task<IReadOnlyList<AdminAccountOptionDto>> GetTeachersAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Teachers
            .AsNoTracking()
            .GroupJoin(
                _dbContext.Users.AsNoTracking(),
                teacher => teacher.UserId,
                user => (int?)user.Id,
                (teacher, users) => new { teacher, user = users.FirstOrDefault() })
            .Select(x => new AdminAccountOptionDto
            {
                Id = x.teacher.Id,
                Name = x.teacher.Name,
                Email = x.teacher.Email,
                Username = x.user != null ? x.user.Username : string.Empty
            })
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AdminAccountOptionDto>> GetStudentsAsync(CancellationToken cancellationToken = default)
    {
        var query =
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking()
                on student.UserId equals user.Id into users
            from user in users.DefaultIfEmpty()
            join classroom in _dbContext.Classes.AsNoTracking()
                on student.ClassCode equals classroom.Code into classrooms
            from classroom in classrooms.DefaultIfEmpty()
            join teacher in _dbContext.Teachers.AsNoTracking()
                on (classroom != null ? classroom.TeacherId : 0) equals teacher.Id into teachers
            from teacher in teachers.DefaultIfEmpty()
            select new
            {
                student,
                user,
                classroom,
                teacher,
                LatestScore = student.ProgressTrackings
                    .OrderByDescending(p => p.WeekNumber)
                    .ThenByDescending(p => p.UpdatedAt)
                    .Select(p => (double?)p.TotalScore)
                    .FirstOrDefault()
            };

        return await query
            .Select(x => new AdminAccountOptionDto
            {
                Id = x.student.Id,
                Name = x.student.Name,
                TeacherId = x.student.TeacherId,
                ClassCode = string.IsNullOrWhiteSpace(x.student.ClassCode) ? null : x.student.ClassCode,
                ClassName = x.classroom != null ? x.classroom.Name : null,
                TeacherName = x.teacher != null ? x.teacher.Name : string.Empty,
                Username = x.user != null ? x.user.Username : string.Empty,
                Score = SoftSkillCalculator.NormalizeDashboardScore(x.LatestScore ?? 0),
                Level = SoftSkillCalculator.ClassifyLevel(x.LatestScore ?? 0)
            })
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<AdminAccountOptionDto> CreateTeacherAsync(CreateTeacherRequestDto request, CancellationToken cancellationToken = default)
    {
        var username = request.Username.Trim();
        var email = request.Email.Trim();

        var usernameExists = await _dbContext.Users.AnyAsync(x => x.Username == username, cancellationToken);
        if (usernameExists)
        {
            throw new InvalidOperationException($"Username {username} already exists.");
        }

        var emailExists = await _dbContext.Teachers.AnyAsync(x => x.Email == email, cancellationToken);
        if (emailExists)
        {
            throw new InvalidOperationException($"Email {email} already exists.");
        }

        var user = new User
        {
            Username = username,
            Password = PasswordHasher.HashPassword(request.Password),
            Role = "teacher"
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var teacher = new Teacher
        {
            Name = request.Name.Trim(),
            Email = email,
            UserId = user.Id
        };
        _dbContext.Teachers.Add(teacher);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminAccountOptionDto
        {
            Id = teacher.Id,
            Name = teacher.Name,
            Email = teacher.Email,
            Username = user.Username
        };
    }

    public async Task<AdminAccountOptionDto> UpdateTeacherAsync(int teacherId, UpdateTeacherRequestDto request, CancellationToken cancellationToken = default)
    {
        var teacher = await _dbContext.Teachers.SingleOrDefaultAsync(x => x.Id == teacherId, cancellationToken)
            ?? throw new InvalidOperationException($"Teacher {teacherId} was not found.");

        var username = request.Username.Trim();
        var email = request.Email.Trim();

        var usernameExists = await _dbContext.Users
            .AnyAsync(x => x.Username == username && x.Id != (teacher.UserId ?? 0), cancellationToken);
        if (usernameExists)
        {
            throw new InvalidOperationException($"Username {username} already exists.");
        }

        var emailExists = await _dbContext.Teachers
            .AnyAsync(x => x.Email == email && x.Id != teacherId, cancellationToken);
        if (emailExists)
        {
            throw new InvalidOperationException($"Email {email} already exists.");
        }

        User? user = null;
        if (teacher.UserId.HasValue)
        {
            user = await _dbContext.Users.SingleOrDefaultAsync(x => x.Id == teacher.UserId.Value, cancellationToken);
        }

        if (user == null)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
            {
                throw new InvalidOperationException("Password is required to create a new teacher account.");
            }

            user = new User
            {
                Username = username,
                Password = PasswordHasher.HashPassword(request.Password),
                Role = "teacher"
            };
            _dbContext.Users.Add(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
            teacher.UserId = user.Id;
        }
        else
        {
            user.Username = username;
            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                user.Password = PasswordHasher.HashPassword(request.Password);
            }
        }

        teacher.Name = request.Name.Trim();
        teacher.Email = email;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminAccountOptionDto
        {
            Id = teacher.Id,
            Name = teacher.Name,
            Email = teacher.Email,
            Username = user.Username
        };
    }

    public async Task DeleteTeacherAsync(int teacherId, CancellationToken cancellationToken = default)
    {
        var teacher = await _dbContext.Teachers.SingleOrDefaultAsync(x => x.Id == teacherId, cancellationToken)
            ?? throw new InvalidOperationException($"Teacher {teacherId} was not found.");

        var hasRelations = await _dbContext.Classes.AnyAsync(x => x.TeacherId == teacherId, cancellationToken)
            || await _dbContext.Students.AnyAsync(x => x.TeacherId == teacherId, cancellationToken);
        if (hasRelations)
        {
            throw new InvalidOperationException("Teacher is assigned to classes or students.");
        }

        if (teacher.UserId.HasValue)
        {
            var user = await _dbContext.Users.SingleOrDefaultAsync(x => x.Id == teacher.UserId.Value, cancellationToken);
            if (user != null)
            {
                _dbContext.Users.Remove(user);
            }
        }

        _dbContext.Teachers.Remove(teacher);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<AdminAccountOptionDto> CreateStudentAsync(CreateStudentRequestDto request, CancellationToken cancellationToken = default)
    {
        var username = request.Username.Trim();
        var classCode = request.ClassCode.Trim();

        var usernameExists = await _dbContext.Users.AnyAsync(x => x.Username == username, cancellationToken);
        if (usernameExists)
        {
            throw new InvalidOperationException($"Username {username} already exists.");
        }

        var teacher = await _dbContext.Teachers.SingleOrDefaultAsync(x => x.Id == request.TeacherId, cancellationToken)
            ?? throw new InvalidOperationException($"Teacher {request.TeacherId} was not found.");

        var classroom = await _dbContext.Classes.SingleOrDefaultAsync(x => x.Code == classCode, cancellationToken)
            ?? throw new InvalidOperationException($"Class {classCode} was not found.");

        var user = new User
        {
            Username = username,
            Password = PasswordHasher.HashPassword(request.Password),
            Role = "student"
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var student = new Student
        {
            Name = request.Name.Trim(),
            ClassCode = classroom.Code,
            TeacherId = teacher.Id,
            UserId = user.Id
        };
        _dbContext.Students.Add(student);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminAccountOptionDto
        {
            Id = student.Id,
            Name = student.Name,
            Username = user.Username,
            ClassCode = student.ClassCode,
            TeacherId = student.TeacherId,
            TeacherName = teacher.Name
        };
    }

    public async Task<AdminAccountOptionDto> UpdateStudentAsync(int studentId, UpdateStudentRequestDto request, CancellationToken cancellationToken = default)
    {
        var student = await _dbContext.Students.SingleOrDefaultAsync(x => x.Id == studentId, cancellationToken)
            ?? throw new InvalidOperationException($"Student {studentId} was not found.");

        var username = request.Username.Trim();
        var classCode = request.ClassCode.Trim();

        var usernameExists = await _dbContext.Users
            .AnyAsync(x => x.Username == username && x.Id != student.UserId, cancellationToken);
        if (usernameExists)
        {
            throw new InvalidOperationException($"Username {username} already exists.");
        }

        var teacher = await _dbContext.Teachers.SingleOrDefaultAsync(x => x.Id == request.TeacherId, cancellationToken)
            ?? throw new InvalidOperationException($"Teacher {request.TeacherId} was not found.");

        var classroom = await _dbContext.Classes.SingleOrDefaultAsync(x => x.Code == classCode, cancellationToken)
            ?? throw new InvalidOperationException($"Class {classCode} was not found.");

        var user = await _dbContext.Users.SingleOrDefaultAsync(x => x.Id == student.UserId, cancellationToken);
        if (user == null)
        {
            throw new InvalidOperationException("Student user account was not found.");
        }

        user.Username = username;
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.Password = PasswordHasher.HashPassword(request.Password);
        }

        student.Name = request.Name.Trim();
        student.ClassCode = classroom.Code;
        student.TeacherId = teacher.Id;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminAccountOptionDto
        {
            Id = student.Id,
            Name = student.Name,
            Username = user.Username,
            ClassCode = student.ClassCode,
            TeacherId = student.TeacherId,
            TeacherName = teacher.Name
        };
    }

    public async Task DeleteStudentAsync(int studentId, CancellationToken cancellationToken = default)
    {
        var student = await _dbContext.Students.SingleOrDefaultAsync(x => x.Id == studentId, cancellationToken)
            ?? throw new InvalidOperationException($"Student {studentId} was not found.");

        var user = await _dbContext.Users.SingleOrDefaultAsync(x => x.Id == student.UserId, cancellationToken);

        _dbContext.Students.Remove(student);
        if (user != null)
        {
            _dbContext.Users.Remove(user);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<ClassroomSummaryDto> MapClassroomAsync(int classId, CancellationToken cancellationToken)
    {
        return await _dbContext.Classes
            .AsNoTracking()
            .Include(c => c.Teacher)
            .Where(c => c.Id == classId)
            .Select(c => new ClassroomSummaryDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                TeacherId = c.TeacherId,
                TeacherName = c.Teacher != null ? c.Teacher.Name : string.Empty,
                StudentCount = c.Students.Count
            })
            .SingleAsync(cancellationToken);
    }

    private async Task<Teacher> GetOrCreateTeacherAsync(string teacherName, CancellationToken cancellationToken)
    {
        var normalizedName = teacherName.Trim();
        var teacher = await _dbContext.Teachers
            .SingleOrDefaultAsync(t => t.Name.ToLower() == normalizedName.ToLower(), cancellationToken);

        if (teacher != null)
        {
            return teacher;
        }

        var email = await GenerateTeacherEmailAsync(normalizedName, cancellationToken);
        teacher = new Teacher
        {
            Name = normalizedName,
            Email = email
        };

        _dbContext.Teachers.Add(teacher);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return teacher;
    }

    private async Task<string> GenerateTeacherEmailAsync(string teacherName, CancellationToken cancellationToken)
    {
        var slug = Slugify(teacherName);
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "teacher";
        }

        var email = $"{slug}@import.local";
        var suffix = 1;

        while (await _dbContext.Teachers.AnyAsync(t => t.Email == email, cancellationToken))
        {
            email = $"{slug}-{suffix}@import.local";
            suffix += 1;
        }

        return email;
    }

    private static string Slugify(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        var lastWasDash = false;

        foreach (var ch in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var lower = char.ToLowerInvariant(ch);
            if (char.IsLetterOrDigit(lower))
            {
                builder.Append(lower);
                lastWasDash = false;
            }
            else if (char.IsWhiteSpace(lower) || lower == '-' || lower == '_' || lower == '.')
            {
                if (!lastWasDash && builder.Length > 0)
                {
                    builder.Append('-');
                    lastWasDash = true;
                }
            }
        }

        return builder.ToString().Trim('-');
    }

    private static double? ParseScore(int row, int column, ExcelWorksheet worksheet)
    {
        var raw = worksheet.Cells[row, column].Text?.Trim();
        if (!double.TryParse(raw, out var score))
        {
            return null;
        }

        return score switch
        {
            < 0 => null,
            <= 1 => score * 10,
            <= 10 => score,
            <= 100 => score / 10,
            _ => null
        };
    }
}
