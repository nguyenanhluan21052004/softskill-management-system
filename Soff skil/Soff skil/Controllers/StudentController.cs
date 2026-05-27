using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Soff_skil.DTOs;
using Soff_skil.Services;
using System.Security.Claims;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StudentController : ControllerBase
{
    private readonly IStudentService _studentService;
    private readonly ISoftSkillService _softSkillService;
    private readonly ILogger<StudentController> _logger;

    public StudentController(
        IStudentService studentService,
        ISoftSkillService softSkillService,
        ILogger<StudentController> logger)
    {
        _studentService = studentService;
        _softSkillService = softSkillService;
        _logger = logger;
    }

    // =========================================
    // GET PROFILE FROM TOKEN
    // =========================================

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var claimValue =
            User.FindFirst("id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(claimValue, out var userId))
        {
            return Unauthorized("Invalid token: missing user id.");
        }

        var profile = await _studentService.GetStudentProfileAsync(userId);

        if (profile == null)
        {
            return NotFound("Student not found");
        }

        return Ok(profile);
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<StudentProfileDto>> UpdateProfile(
        [FromBody] UpdateStudentProfileRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var claimValue =
            User.FindFirst("id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(claimValue, out var userId))
        {
            return Unauthorized("Invalid token: missing user id.");
        }

        var profile = await _studentService.UpdateProfileByUserIdAsync(userId, request, cancellationToken);

        if (profile == null)
        {
            return NotFound("Student not found");
        }

        return Ok(profile);
    }

    [Authorize]
    [HttpPut("password")]
    public async Task<IActionResult> UpdatePassword(
        [FromBody] UpdateStudentPasswordRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var claimValue =
            User.FindFirst("id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(claimValue, out var userId))
        {
            return Unauthorized("Invalid token: missing user id.");
        }

        try
        {
            await _studentService.UpdatePasswordByUserIdAsync(userId, request, cancellationToken);
            return Ok(new { message = "Password updated successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [Authorize(Roles = "student,Student")]
    [HttpGet("evaluations")]
    public async Task<ActionResult<IReadOnlyList<CreateEvaluationDto>>> GetMyEvaluations(
        CancellationToken cancellationToken)
    {
        var claimValue =
            User.FindFirst("id")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(claimValue, out var userId))
        {
            return Unauthorized("Invalid token: missing user id.");
        }

        var profile = await _studentService.GetStudentProfileAsync(userId, cancellationToken);
        if (profile == null)
        {
            return NotFound("Student not found");
        }

        var results = await _softSkillService.GetEvaluationsByStudentAsync(profile.StudentId, cancellationToken);
        return Ok(results);
    }

    // =========================================
    // OPTIONAL TEST API
    // =========================================

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StudentProfileDto>> GetStudentProfile(
        int id,
        CancellationToken cancellationToken)
    {
        var profile = await _studentService
            .GetStudentProfileAsync(id, cancellationToken);

        if (profile == null)
        {
            return NotFound($"Student {id} was not found.");
        }

        return Ok(profile);
    }
}