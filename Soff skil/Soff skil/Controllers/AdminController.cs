using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Soff_skil.DTOs;
using Soff_skil.Services;
using System.Security.Claims;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,Admin,teacher,Teacher")] // cho phép teacher đọc class data nếu frontend gọi nhầm /api/Admin/*
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ISoftSkillService _softSkillService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        IAdminService adminService,
        ISoftSkillService softSkillService,
        ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _softSkillService = softSkillService;
        _logger = logger;
    }

    // ================= IMPORT EXCEL =================
    [HttpPost("import-excel")]
    public async Task<ActionResult<ImportExcelResponseDto>> ImportExcel(IFormFile file, CancellationToken cancellationToken)
    {
        try
        {
            if (file is null || file.Length == 0)
            {
                return BadRequest("Excel file is required.");
            }

            _logger.LogInformation("Import excel file {FileName}", file.FileName);

            var result = await _adminService.ImportExcelAsync(file, cancellationToken);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while importing student data from excel.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }

    [HttpGet("classes")]
    public async Task<ActionResult<IReadOnlyList<ClassroomSummaryDto>>> GetClasses(CancellationToken cancellationToken)
    {
        var classes = await _adminService.GetClassroomsAsync(cancellationToken);
        return Ok(classes);
    }

    [HttpGet("results")]
    [HttpGet("/api/results")]
    [ProducesResponseType(typeof(SoftSkillResultsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<SoftSkillResultsResponseDto>> GetResults(CancellationToken cancellationToken)
    {
        try
        {
            var results = await _softSkillService.GetResultsAsync(cancellationToken);
            return Ok(new SoftSkillResultsResponseDto
            {
                Items = results,
                TotalItems = results.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving admin results.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }

    [HttpGet("result")]
    [HttpGet("/api/result")]
    [ProducesResponseType(typeof(IReadOnlyList<SoftSkillResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IReadOnlyList<SoftSkillResultDto>>> GetTopResults(
        [FromQuery] TopSoftSkillQueryDto query,
        CancellationToken cancellationToken)
    {
        try
        {
            var results = await _softSkillService.GetTopResultsAsync(query.Limit, cancellationToken);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while retrieving admin top results.");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }

    [HttpGet("teachers")]
    public async Task<ActionResult<IReadOnlyList<AdminAccountOptionDto>>> GetTeachers(CancellationToken cancellationToken)
    {
        var teachers = await _adminService.GetTeachersAsync(cancellationToken);
        return Ok(teachers);
    }

    [HttpGet("students")]
    public async Task<ActionResult<IReadOnlyList<AdminAccountOptionDto>>> GetStudents(CancellationToken cancellationToken)
    {
        var students = await _adminService.GetStudentsAsync(cancellationToken);
        return Ok(students);
    }

    [HttpPost("classes")]
    public async Task<ActionResult<ClassroomSummaryDto>> CreateClass(
        [FromBody] ManageClassroomRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await _adminService.CreateClassroomAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("classes/{classId:int}")]
    public async Task<ActionResult<ClassroomSummaryDto>> UpdateClass(
        int classId,
        [FromBody] ManageClassroomRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await _adminService.UpdateClassroomAsync(classId, request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPatch("classes/{classId:int}/teacher")]
    public async Task<ActionResult<ClassroomSummaryDto>> ReassignTeacher(
        int classId,
        [FromBody] ReassignClassroomTeacherRequestDto request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        try
        {
            var result = await _adminService.ReassignTeacherAsync(classId, request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // ================= ADMIN PROFILE =================
    [HttpGet("me")]
    public IActionResult GetAdminProfile()
    {
        try
        {
            var userId = User.FindFirst("id")?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            if (userId == null)
                return Unauthorized("Invalid token");

            return Ok(new
            {
                Id = userId,
                Role = role,
                Message = "Admin authenticated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while loading admin profile");
            return StatusCode(StatusCodes.Status500InternalServerError, "An unexpected error occurred.");
        }
    }
}
