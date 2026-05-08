using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Soff_skil.DTOs;
using Soff_skil.Services;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "teacher,admin,Teacher,Admin")]
public class SoftSkillController : ControllerBase
{
    private readonly ISoftSkillService _softSkillService;
    private readonly ILogger<SoftSkillController> _logger;

    public SoftSkillController(ISoftSkillService softSkillService, ILogger<SoftSkillController> logger)
    {
        _softSkillService = softSkillService;
        _logger = logger;
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

            var topResults = await _softSkillService.GetTopResultsAsync(query.Limit, cancellationToken);
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
            var statistics = await _softSkillService.GetStatisticsAsync(cancellationToken);
            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving soft skill statistics.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }
}
