using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Soff_skil.DTOs;
using Soff_skil.Services;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/evaluations")]
[Route("api/teacher/evaluations")]
[Route("api/admin/evaluations")]
[Route("evaluations")]
[Authorize(Roles = "teacher,admin,Teacher,Admin")]
public class EvaluationController : ControllerBase
{
    private readonly ISoftSkillService _softSkillService;
    private readonly ILogger<EvaluationController> _logger;

    public EvaluationController(ISoftSkillService softSkillService, ILogger<EvaluationController> logger)
    {
        _softSkillService = softSkillService;
        _logger = logger;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SoftSkillResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<SoftSkillResultDto>>> GetEvaluations(CancellationToken cancellationToken)
    {
        try
        {
            var results = await _softSkillService.GetResultsAsync(cancellationToken);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving evaluations.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }

    [HttpPost("create")]
    [ProducesResponseType(typeof(EvaluationCreateResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<EvaluationCreateResponseDto>> CreateEvaluation(
        [FromBody] EvaluationCreateRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return ValidationProblem(ModelState);
            }

            var result = await _softSkillService.CreateEvaluationAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Student not found when creating evaluation.");
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while creating evaluation.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }

    [HttpGet("student/{id:int}")]
    [ProducesResponseType(typeof(IReadOnlyList<CreateEvaluationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<CreateEvaluationDto>>> GetStudentEvaluations(
    int id,
    CancellationToken cancellationToken)
    {
        try
        {
            var results = await _softSkillService.GetEvaluationsByStudentAsync(
                id,
                cancellationToken);

            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error while retrieving evaluations for student {StudentId}.",
                id);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.");
        }
    }
}
