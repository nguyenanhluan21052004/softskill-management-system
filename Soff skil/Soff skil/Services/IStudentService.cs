using Soff_skil.DTOs;

namespace Soff_skil.Services;

public interface IStudentService
{
    Task<StudentProfileDto?> GetStudentProfileAsync(int studentId, CancellationToken cancellationToken = default);

    Task<StudentProfileDto?> UpdateProfileByUserIdAsync(
        int userId,
        UpdateStudentProfileRequestDto request,
        CancellationToken cancellationToken = default);

    Task UpdatePasswordByUserIdAsync(
        int userId,
        UpdateStudentPasswordRequestDto request,
        CancellationToken cancellationToken = default);
}
