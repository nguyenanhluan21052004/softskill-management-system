using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Soff_skil.DTOs;
using Soff_skil.Services;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "teacher,admin,Teacher,Admin")]
public class DashboardController : ControllerBase
{
    private readonly ISoftSkillService _softSkillService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        ISoftSkillService softSkillService,
        ILogger<DashboardController> logger)
    {
        _softSkillService = softSkillService;
        _logger = logger;
    }

    // =========================================
    // TOP RESULTS
    // dùng GetTopResultsAsync mới
    // =========================================

    [HttpGet("top-students")]
    [ProducesResponseType(typeof(IReadOnlyList<SoftSkillResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<SoftSkillResultDto>>> GetTopStudents(
        [FromQuery] int limit,
        CancellationToken cancellationToken)
    {
        try
        {
            var results = await _softSkillService
                .GetTopResultsAsync(limit, cancellationToken);

            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving top students.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.");
        }
    }

    // =========================================
    // STATISTICS
    // thay cho GetAtRiskStudentsAsync cũ
    // =========================================

    [HttpGet("statistics")]
    [ProducesResponseType(typeof(SoftSkillStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SoftSkillStatisticsDto>> GetStatistics(
        CancellationToken cancellationToken)
    {
        try
        {
            var statistics = await _softSkillService
                .GetStatisticsAsync(cancellationToken);

            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving dashboard statistics.");

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.");
        }
    }
}