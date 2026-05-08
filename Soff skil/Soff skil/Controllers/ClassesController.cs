using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Soff_skil.Data;
using Soff_skil.DTOs;
using System.Security.Claims;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin,teacher,Teacher")]
public class ClassesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public ClassesController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ClassroomSummaryDto>>> GetClasses(CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var userIdClaim = User.FindFirst("id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var hasUserId = int.TryParse(userIdClaim, out var userId);

        IQueryable<Models.Classroom> query = _dbContext.Classes
            .AsNoTracking()
            .Include(c => c.Teacher);

        if (string.Equals(role, "teacher", StringComparison.OrdinalIgnoreCase) && hasUserId)
        {
            var teacherId = await _dbContext.Teachers
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .Select(t => (int?)t.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (teacherId.HasValue)
            {
                query = query.Where(c => c.TeacherId == teacherId.Value);
            }
            else
            {
                query = query.Where(c => false);
            }
        }

        var classes = await query
            .Select(c => new ClassroomSummaryDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                TeacherId = c.TeacherId,
                TeacherName = c.Teacher != null ? c.Teacher.Name : string.Empty,
                StudentCount = c.Students.Count
            })
            .OrderBy(c => c.Code)
            .ToListAsync(cancellationToken);

        return Ok(classes);
    }
}
