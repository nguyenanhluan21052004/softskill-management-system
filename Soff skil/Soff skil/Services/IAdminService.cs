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
    Task<AdminAccountOptionDto> CreateTeacherAsync(CreateTeacherRequestDto request, CancellationToken cancellationToken = default);
    Task<AdminAccountOptionDto> UpdateTeacherAsync(int teacherId, UpdateTeacherRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteTeacherAsync(int teacherId, CancellationToken cancellationToken = default);
    Task<AdminAccountOptionDto> CreateStudentAsync(CreateStudentRequestDto request, CancellationToken cancellationToken = default);
    Task<AdminAccountOptionDto> UpdateStudentAsync(int studentId, UpdateStudentRequestDto request, CancellationToken cancellationToken = default);
    Task DeleteStudentAsync(int studentId, CancellationToken cancellationToken = default);
    Task<BackfillEvaluationResponseDto> BackfillEvaluationDetailsAsync(bool overwrite = false, CancellationToken cancellationToken = default);
}
