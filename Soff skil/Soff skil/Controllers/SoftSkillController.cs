using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Soff_skil.Data;
using Soff_skil.DTOs;
using Soff_skil.Services;
using System.Security.Claims;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "teacher,admin,Teacher,Admin")]
public class SoftSkillController : ControllerBase
{
    private readonly ISoftSkillService _softSkillService;
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<SoftSkillController> _logger;

    public SoftSkillController(
        ISoftSkillService softSkillService,
        ApplicationDbContext dbContext,
        ILogger<SoftSkillController> logger)
    {
        _softSkillService = softSkillService;
        _dbContext = dbContext;
        _logger = logger;
    }

    private bool IsTeacherRequest()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        return string.Equals(role, "teacher", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<HashSet<string>> GetTeacherClassCodesAsync(CancellationToken cancellationToken)
    {
        var claimValue =
            User.FindFirst("id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(claimValue, out var userId))
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }

        var teacherId = await _dbContext.Teachers
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .Select(t => (int?)t.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (!teacherId.HasValue)
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }

        var classCodes = await _dbContext.Classes
            .AsNoTracking()
            .Where(c => c.TeacherId == teacherId.Value)
            .Select(c => c.Code)
            .ToListAsync(cancellationToken);

        return classCodes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Get all student soft-skill results for dashboard.
    /// </summary>
    [HttpGet("results")]
    [ProducesResponseType(typeof(IReadOnlyList<SoftSkillResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<SoftSkillResultDto>>> GetResults(CancellationToken cancellationToken)
    {
        try
        {
            var results = await _softSkillService.GetResultsAsync(cancellationToken);

            if (IsTeacherRequest())
            {
                var classCodes = await GetTeacherClassCodesAsync(cancellationToken);
                results = results
                    .Where(result => classCodes.Contains(result.ClassCode ?? string.Empty))
                    .ToList();
            }

            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving soft skill results.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// Get top students by soft-skill score.
    /// </summary>
    [HttpGet("top")]
    [ProducesResponseType(typeof(IReadOnlyList<SoftSkillResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<SoftSkillResultDto>>> GetTopResults(
        [FromQuery] TopSoftSkillQueryDto query,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var normalizedLimit = query.Limit <= 0 ? 5 : query.Limit;
            var results = await _softSkillService.GetResultsAsync(cancellationToken);

            if (IsTeacherRequest())
            {
                var classCodes = await GetTeacherClassCodesAsync(cancellationToken);
                results = results
                    .Where(result => classCodes.Contains(result.ClassCode ?? string.Empty))
                    .ToList();
            }

            var topResults = results
                .OrderByDescending(result => result.TotalScore)
                .Take(normalizedLimit)
                .ToList();

            return Ok(topResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving top soft skill results.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// Get aggregated soft-skill statistics.
    /// </summary>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(SoftSkillStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SoftSkillStatisticsDto>> GetStatistics(CancellationToken cancellationToken)
    {
        try
        {
            var results = await _softSkillService.GetResultsAsync(cancellationToken);

            if (IsTeacherRequest())
            {
                var classCodes = await GetTeacherClassCodesAsync(cancellationToken);
                results = results
                    .Where(result => classCodes.Contains(result.ClassCode ?? string.Empty))
                    .ToList();
            }

            if (results.Count == 0)
            {
                return Ok(new SoftSkillStatisticsDto());
            }

            var statistics = new SoftSkillStatisticsDto
            {
                TotalStudents = results.Count,
                AverageScore = Math.Round(results.Average(x => (double)x.TotalScore), 2),
                Good = results.Count(x => x.Rank == "Tốt"),
                Average = results.Count(x => x.Rank == "Trung bình"),
                Weak = results.Count(x => x.Rank == "Yếu")
            };

            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving soft skill statistics.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }
}
