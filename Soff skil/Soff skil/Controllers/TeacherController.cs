using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Soff_skil.DTOs;
using Soff_skil.Services;
using System.Security.Claims;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "teacher,Teacher")] // 🔥 chỉ teacher
public class TeacherController : ControllerBase
{
    private readonly ITeacherService _teacherService;
    private readonly ILogger<TeacherController> _logger;

    public TeacherController(ITeacherService teacherService, ILogger<TeacherController> logger)
    {
        _teacherService = teacherService;
        _logger = logger;
    }

    // ================= DASHBOARD =================
    [Authorize(Roles = "teacher,Teacher")]
    [HttpGet("me")]
    public async Task<ActionResult<TeacherDashboardDto>> GetMyDashboard(CancellationToken cancellationToken)
    {
        var claimValue = User.FindFirst("id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(claimValue, out var userId))
        {
            return Unauthorized("Invalid token: missing user id.");
        }

        var dashboard = await _teacherService.GetDashboardByUserIdAsync(userId, cancellationToken);

        if (dashboard == null)
        {
            return NotFound("Teacher not found.");
        }

        return Ok(dashboard);
    }
    // ================= PROFILE =================
    [HttpGet("profile")]
    public IActionResult GetMyInfo()
    {
        var userId = User.FindFirst("id")?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        return Ok(new
        {
            Id = userId,
            Role = role
        });
    }
}
