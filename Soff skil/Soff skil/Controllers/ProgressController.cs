using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Soff_skil.DTOs;
using Soff_skil.Services;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "teacher,admin,student,Teacher,Admin,Student")]
public class ProgressController : ControllerBase
{
    private readonly ISoftSkillService _softSkillService;
    private readonly ILogger<ProgressController> _logger;

    public ProgressController(ISoftSkillService softSkillService, ILogger<ProgressController> logger)
    {
        _softSkillService = softSkillService;
        _logger = logger;
    }

    [HttpGet("student/{id:int}")]
    [ProducesResponseType(typeof(StudentProgressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<StudentProgressDto>> GetStudentProgress(int id, CancellationToken cancellationToken)
    {
        try
        {
            var progress = await _softSkillService.GetStudentProgressAsync(id, cancellationToken);
            if (progress == null)
            {
                return NotFound($"Student {id} was not found.");
            }

            return Ok(progress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving progress for student {StudentId}.", id);
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }
}
