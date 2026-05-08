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
    private readonly ILogger<StudentController> _logger;

    public StudentController(
        IStudentService studentService,
        ILogger<StudentController> logger)
    {
        _studentService = studentService;
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