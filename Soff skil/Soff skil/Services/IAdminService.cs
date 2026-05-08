using Microsoft.AspNetCore.Http;
using Soff_skil.DTOs;

namespace Soff_skil.Services;

public interface IAdminService
{
    Task<ImportExcelResponseDto> ImportExcelAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task<ClassroomSummaryDto> CreateClassroomAsync(ManageClassroomRequestDto request, CancellationToken cancellationToken = default);
    Task<ClassroomSummaryDto> UpdateClassroomAsync(int classId, ManageClassroomRequestDto request, CancellationToken cancellationToken = default);
    Task<ClassroomSummaryDto> ReassignTeacherAsync(int classId, ReassignClassroomTeacherRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ClassroomSummaryDto>> GetClassroomsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AdminAccountOptionDto>> GetTeachersAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AdminAccountOptionDto>> GetStudentsAsync(CancellationToken cancellationToken = default);
}
