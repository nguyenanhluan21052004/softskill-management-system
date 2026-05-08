using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Soff_skil.DTOs;
using Soff_skil.Services;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "teacher,admin,student,Teacher,Admin,Student")]
public class RecommendationController : ControllerBase
{
    private readonly ISoftSkillService _softSkillService;
    private readonly ILogger<RecommendationController> _logger;

    public RecommendationController(ISoftSkillService softSkillService, ILogger<RecommendationController> logger)
    {
        _softSkillService = softSkillService;
        _logger = logger;
    }

    [HttpGet("student/{id:int}")]
    [ProducesResponseType(typeof(IReadOnlyList<RecommendationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<RecommendationDto>>> GetStudentRecommendations(
        int id,
        CancellationToken cancellationToken)
    {
        try
        {
            var recommendations = await _softSkillService.GetRecommendationsAsync(id, cancellationToken);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving recommendations for student {StudentId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }
}
