using Soff_skil.DTOs;

namespace Soff_skil.Services;

public interface IStudentService
{
    Task<StudentProfileDto?> GetStudentProfileAsync(int studentId, CancellationToken cancellationToken = default);
}
