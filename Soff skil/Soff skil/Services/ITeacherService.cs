using Soff_skil.DTOs;

namespace Soff_skil.Services;

public interface ITeacherService
{
    Task<TeacherDashboardDto?> GetDashboardAsync(int teacherId, CancellationToken cancellationToken);

    // 🔥 dùng cho JWT (me)
    Task<TeacherDashboardDto?> GetDashboardByUserIdAsync(int userId, CancellationToken cancellationToken);

    Task<TeacherProfileDto?> UpdateProfileByUserIdAsync(
        int userId,
        UpdateTeacherProfileRequestDto request,
        CancellationToken cancellationToken = default);

    Task UpdatePasswordByUserIdAsync(
        int userId,
        UpdateTeacherPasswordRequestDto request,
        CancellationToken cancellationToken = default);
}