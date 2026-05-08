using Microsoft.EntityFrameworkCore;
using Soff_skil.Data;
using Soff_skil.DTOs;
using Soff_skil.Models;

namespace Soff_skil.Repositories;

public class SoftSkillRepository : ISoftSkillRepository
{
    private readonly ApplicationDbContext _dbContext;

    public SoftSkillRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // Lấy toàn bộ kết quả kỹ năng mềm của sinh viên
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

                TotalScore = p != null ? p.TotalScore : 0,

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

    // Lấy tiến độ mới nhất của từng sinh viên
    public async Task<IReadOnlyList<ProgressTracking>> GetLatestProgressAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.ProgressTrackings
            .AsNoTracking()
            .GroupBy(x => x.StudentId)
            .Select(group => group
                .OrderByDescending(x => x.WeekNumber)
                .ThenByDescending(x => x.UpdatedAt)
                .FirstOrDefault())
            .Where(x => x != null)
            .ToListAsync(cancellationToken);
    }

    // Lấy top sinh viên điểm cao nhất
    public async Task<IReadOnlyList<ProgressTracking>> GetTopProgressAsync(
        int limit,
        CancellationToken cancellationToken = default)
    {
        var normalizedLimit = limit <= 0 ? 5 : limit;

        return await _dbContext.ProgressTrackings
            .AsNoTracking()
            .OrderByDescending(x => x.TotalScore)
            .ThenBy(x => x.StudentId)
            .Take(normalizedLimit)
            .ToListAsync(cancellationToken);
    }
}