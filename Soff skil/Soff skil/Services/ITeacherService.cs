using Soff_skil.DTOs;

namespace Soff_skil.Services;

public interface ITeacherService
{
    Task<TeacherDashboardDto?> GetDashboardAsync(int teacherId, CancellationToken cancellationToken);

    // 🔥 dùng cho JWT (me)
    Task<TeacherDashboardDto?> GetDashboardByUserIdAsync(int userId, CancellationToken cancellationToken);
}